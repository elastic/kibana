/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import {
  TransformGetTransformStatsResponse,
  TransformGetTransformStatsTransformStats,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreSetup, ElasticsearchClient, Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  throwUnrecoverableError,
} from '../../../../../task_manager/server';
import { EndpointAppContext } from '../../types';
import { METADATA_TRANSFORMS_PATTERN } from '../../../../common/endpoint/constants';
import { WARNING_TRANSFORM_STATES } from '../../../../common/constants';
import { wrapErrorIfNeeded } from '../../utils';
import { ElasticsearchAssetType, FLEET_ENDPOINT_PACKAGE } from '../../../../../fleet/common';

const SCOPE = ['securitySolution'];
const INTERVAL = '2h';
const TIMEOUT = '4m';
export const TYPE = 'endpoint:metadata-check-transforms-task';
export const VERSION = '0.0.1';
const MAX_ATTEMPTS = 5;
export const BASE_NEXT_ATTEMPT_DELAY = 5; // minutes

export interface CheckMetadataTransformsTaskSetupContract {
  endpointAppContext: EndpointAppContext;
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
}

export interface CheckMetadataTransformsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class CheckMetadataTransformsTask {
  private endpointAppContext: EndpointAppContext;
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: CheckMetadataTransformsTaskSetupContract) {
    const { endpointAppContext, core, taskManager } = setupContract;
    this.endpointAppContext = endpointAppContext;
    this.logger = endpointAppContext.logFactory.get(this.getTaskId());
    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'Security Solution Endpoint Metadata Periodic Tasks',
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: CheckMetadataTransformsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('missing required service during start');
      return;
    }

    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {
          attempts: {},
        },
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, received ${e.message}`);
    }
  };

  private runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. MetadataTask not started yet');
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.getTaskId()) {
      // old task, die
      throwUnrecoverableError(new Error('Outdated task version'));
    }

    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;

    let transformStatsResponse: TransportResult<TransformGetTransformStatsResponse>;
    try {
      transformStatsResponse = await esClient?.transform.getTransformStats(
        {
          transform_id: METADATA_TRANSFORMS_PATTERN,
        },
        { meta: true }
      );
    } catch (e) {
      const err = wrapErrorIfNeeded(e);
      const errMessage = `failed to get transform stats with error: ${err}`;
      this.logger.error(errMessage);

      return;
    }

    const packageClient = this.endpointAppContext.service.getInternalFleetServices().packages;
    const installation = await packageClient.getInstallation(FLEET_ENDPOINT_PACKAGE);
    if (!installation) {
      this.logger.info('no endpoint installation found');
      return;
    }
    const expectedTransforms = installation.installed_es.filter(
      (asset) => asset.type === ElasticsearchAssetType.transform
    );

    const { transforms } = transformStatsResponse.body;
    let { reinstallAttempts } = taskInstance.state;
    let runAt: Date | undefined;
    if (transforms.length !== expectedTransforms.length) {
      const { attempts, didAttemptReinstall } = await this.reinstallTransformsIfNeeded(
        installation.version,
        reinstallAttempts
      );
      reinstallAttempts = attempts;

      // after a reinstall attempt next check sooner with exponential backoff
      if (didAttemptReinstall) {
        runAt = this.getNextRunAt(reinstallAttempts);
      }

      return this.buildNextTask({ reinstallAttempts, runAt });
    }

    let didAttemptRestart: boolean = false;
    let highestAttempt: number = 0;
    const restartAttempts: Record<string, number> = { ...taskInstance.state.restartAttempts };

    for (const transform of transforms) {
      const restartedTransform = await this.restartTransformIfNeeded(
        esClient,
        transform,
        restartAttempts[transform.id]
      );
      if (restartedTransform.didAttemptRestart) {
        didAttemptRestart = true;
      }
      restartAttempts[transform.id] = restartedTransform.attempts;
      highestAttempt = Math.max(restartAttempts[transform.id], highestAttempt);
    }

    // after a restart attempt next check sooner with exponential backoff
    if (didAttemptRestart) {
      runAt = this.getNextRunAt(highestAttempt);
    }

    return this.buildNextTask({ restartAttempts, runAt });
  };

  private restartTransformIfNeeded = async (
    esClient: ElasticsearchClient,
    transform: TransformGetTransformStatsTransformStats,
    currentAttempts: number = 0
  ) => {
    let attempts = currentAttempts;
    let didAttemptRestart = false;

    if (!WARNING_TRANSFORM_STATES.has(transform.state)) {
      return {
        attempts,
        didAttemptRestart,
      };
    }

    if (attempts > MAX_ATTEMPTS) {
      this.logger.warn(
        `transform ${transform.id} has failed to restart ${attempts} times. stopping auto restart attempts.`
      );
      return {
        attempts,
        didAttemptRestart,
      };
    }

    try {
      this.logger.info(`failed transform detected with id: ${transform.id}. attempting restart.`);
      await esClient.transform.stopTransform({
        transform_id: transform.id,
        allow_no_match: true,
        wait_for_completion: true,
        force: true,
      });
      await esClient.transform.startTransform({
        transform_id: transform.id,
      });

      // restart succeeded, reset attempt count
      attempts = 0;
    } catch (e) {
      const err = wrapErrorIfNeeded(e);
      const errMessage = `failed to restart transform ${transform.id} with error: ${err}`;
      this.logger.error(errMessage);

      // restart failed, increment attempt count
      attempts = attempts + 1;
    } finally {
      didAttemptRestart = true;
    }

    return {
      attempts,
      didAttemptRestart,
    };
  };

  private reinstallTransformsIfNeeded = async (pkgVersion: string, currentAttempts = 0) => {
    let attempts = currentAttempts;
    let didAttemptReinstall = false;
    const endpointPolicies = await this.endpointAppContext.service
      .getEndpointMetadataService()
      .getAllEndpointPackagePolicies();

    // endpoint not being used, no need to reinstall transforms
    if (!endpointPolicies.length) {
      return { attempts, didAttemptReinstall };
    }

    if (attempts > MAX_ATTEMPTS) {
      this.logger.info('missing endpoint metadata transforms found, attempting reinstall');
      return { attempts, didAttemptReinstall };
    }

    try {
      // endpoint policy exists but transforms don't exist, attempt to reinstall
      this.logger.info('missing endpoint transforms found, attempting reinstall');

      const packageClient = this.endpointAppContext.service.getInternalFleetServices().packages;

      const { packageInfo, paths } = await packageClient.getRegistryPackage(
        FLEET_ENDPOINT_PACKAGE,
        pkgVersion
      );
      const transformPaths = paths.filter(this.isTransformPath);
      const reinstalledTransforms = await packageClient.reinstallEsAssets(
        packageInfo,
        transformPaths
      );
      if (reinstalledTransforms.length !== transformPaths.length) {
        throw new Error(
          'number of reinstalled transforms does not match the expected number of transforms'
        );
      }

      // reset attempts on successful reinstall
      attempts = 0;
    } catch (e) {
      const err = wrapErrorIfNeeded(e);
      const errMessage = `failed to reinstall endpoint transforms with error: ${err}`;
      this.logger.error(errMessage);

      // restart failed, increment attempt count
      attempts = attempts + 1;
    } finally {
      didAttemptReinstall = true;
    }

    return { attempts, didAttemptReinstall };
  };

  private getTaskId = (): string => {
    return `${TYPE}:${VERSION}`;
  };

  private getNextRunAt(attempt = 0) {
    const delay = BASE_NEXT_ATTEMPT_DELAY ** Math.max(attempt, 1) * 60000;
    return new Date(new Date().getTime() + delay);
  }

  private buildNextTask({
    restartAttempts = {},
    reinstallAttempts = 0,
    runAt = undefined,
  }: {
    restartAttempts?: Record<string, number>;
    reinstallAttempts?: number;
    runAt?: Date | undefined;
  }) {
    const nextState = { restartAttempts, reinstallAttempts };
    const nextTask = runAt ? { state: nextState, runAt } : { state: nextState };
    return nextTask;
  }

  private isTransformPath(path: string) {
    const type = path.split('/')[2];
    return !path.endsWith('/') && type === ElasticsearchAssetType.transform;
  }
}

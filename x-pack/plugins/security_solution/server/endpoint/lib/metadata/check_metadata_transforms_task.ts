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
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: CheckMetadataTransformsTaskSetupContract) {
    const { endpointAppContext, core, taskManager } = setupContract;
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
      transformStatsResponse = await esClient?.transform.getTransformStats({
        transform_id: METADATA_TRANSFORMS_PATTERN,
      });
    } catch (e) {
      const err = wrapErrorIfNeeded(e);
      const errMessage = `failed to get transform stats with error: ${err}`;
      this.logger.error(errMessage);

      return;
    }

    const { transforms } = transformStatsResponse.body;
    if (!transforms.length) {
      this.logger.info('no endpoint metadata transforms found');
      return;
    }

    let didAttemptRestart: boolean = false;
    let highestAttempt: number = 0;
    const attempts = { ...taskInstance.state.attempts };

    for (const transform of transforms) {
      const restartedTransform = await this.restartTransform(
        esClient,
        transform,
        attempts[transform.id]
      );
      if (restartedTransform.didAttemptRestart) {
        didAttemptRestart = true;
      }
      attempts[transform.id] = restartedTransform.attempts;
      highestAttempt = Math.max(attempts[transform.id], highestAttempt);
    }

    // after a restart attempt run next check sooner with exponential backoff
    let runAt: Date | undefined;
    if (didAttemptRestart) {
      const delay = BASE_NEXT_ATTEMPT_DELAY ** Math.max(highestAttempt, 1) * 60000;
      runAt = new Date(new Date().getTime() + delay);
    }

    const nextState = { attempts };
    const nextTask = runAt ? { state: nextState, runAt } : { state: nextState };
    return nextTask;
  };

  private restartTransform = async (
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

  private getTaskId = (): string => {
    return `${TYPE}:${VERSION}`;
  };
}

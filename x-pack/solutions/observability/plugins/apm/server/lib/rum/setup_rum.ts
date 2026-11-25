/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { defer, retry } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { APMPluginStartDependencies } from '../../types';
import {
  RumPolicyService,
  RUM_POLICY_TYPE,
  rumPolicySavedObject,
  rumSettingsSchema,
} from './rum_policy_service';

const TASK_TYPE = 'apm:republish_rum_policy';
const RUM_PATH = '/internal/apm/rum';
const readSecurity = { authz: { requiredPrivileges: ['apm'] } };
const writeSecurity = { authz: { requiredPrivileges: ['apm', 'apm_settings_write'] } };

export const setupRum = (
  core: CoreSetup<APMPluginStartDependencies>,
  taskManager: TaskManagerSetupContract | undefined,
  enabled: boolean,
  logger: Logger
): (() => void) | undefined => {
  core.savedObjects.registerType(rumPolicySavedObject);
  if (!taskManager) {
    if (enabled) {
      logger.warn('Managed RUM requires Task Manager');
    }
    return;
  }

  const startServices = core.getStartServices();
  const service = enabled
    ? startServices
        .then(([coreStart, plugins]) => {
          const agentless = plugins.fleet?.agentless.createRumClient?.();
          if (!agentless || !plugins.taskManager) {
            logger.warn(
              'Managed RUM requires the Fleet Agentless mTLS configuration and Task Manager'
            );
            return;
          }
          return new RumPolicyService(
            coreStart.savedObjects.getUnsafeInternalClient({
              includedHiddenTypes: [RUM_POLICY_TYPE],
            }),
            agentless,
            logger
          );
        })
        .catch(() => {
          logger.error('Failed to initialize the Managed RUM Agentless client');
          return undefined;
        })
    : Promise.resolve(undefined);

  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Republish the APM RUM policy',
      description: 'Restores the latest saved RUM policy in Agentless API',
      timeout: '30s',
      createTaskRunner: () => ({
        async run() {
          const policy = await service;
          if (policy && !(await policy.publishLatest())) {
            throw new Error('Could not republish the RUM policy');
          }
        },
      }),
    },
  });

  if (!enabled) {
    return;
  }

  let scheduled: Promise<void> | undefined;
  const ensureRecoveryScheduled = () =>
    (scheduled ??= Promise.all([startServices, service])
      .then(async ([[, plugins], policy]) => {
        if (policy) {
          await plugins.taskManager?.ensureScheduled({
            id: TASK_TYPE,
            taskType: TASK_TYPE,
            scope: ['apm'],
            schedule: { interval: '1m' },
            params: {},
            state: {},
          });
        }
      })
      .catch(() => {
        scheduled = undefined;
        logger.error('Failed to schedule Managed RUM policy publishing');
        throw Boom.serverUnavailable('Managed RUM policy recovery is unavailable');
      }));

  // Keep retrying on idle deployments too, where no request will trigger scheduling.
  const startup = defer(ensureRecoveryScheduled)
    .pipe(retry({ delay: 60_000 }))
    .subscribe();

  const getService = async (request: KibanaRequest): Promise<RumPolicyService> => {
    const [, plugins] = await startServices;
    const space = plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
    if (space !== DEFAULT_SPACE_ID) {
      throw Boom.forbidden('Managed RUM settings are available in the default space only');
    }
    const policy = await service;
    if (!policy) {
      throw Boom.serverUnavailable('Managed RUM is unavailable');
    }
    await ensureRecoveryScheduled();
    return policy;
  };

  const router = core.http.createRouter();
  router.get(
    { path: RUM_PATH, validate: false, security: readSecurity, options: { access: 'internal' } },
    router.handleLegacyErrors(async (_context, request, response) =>
      response.ok({ body: await (await getService(request)).getSettings() })
    )
  );

  router.put(
    {
      path: RUM_PATH,
      validate: { body: rumSettingsSchema },
      security: writeSecurity,
      options: { access: 'internal' },
    },
    router.handleLegacyErrors(async (_context, request, response) =>
      response.ok({
        body: { published: await (await getService(request)).updateSettings(request.body) },
      })
    )
  );

  router.delete(
    { path: RUM_PATH, validate: false, security: writeSecurity, options: { access: 'internal' } },
    router.handleLegacyErrors(async (_context, request, response) =>
      response.ok({ body: { published: await (await getService(request)).deleteSettings() } })
    )
  );

  router.post(
    {
      path: `${RUM_PATH}/client_tokens`,
      validate: false,
      security: writeSecurity,
      options: { access: 'internal' },
    },
    router.handleLegacyErrors(async (_context, request, response) =>
      response.created({
        body: await (await getService(request)).createToken(),
        headers: { 'cache-control': 'no-store' },
      })
    )
  );

  router.delete(
    {
      path: `${RUM_PATH}/client_tokens/{id}`,
      validate: {
        params: schema.object({ id: schema.string({ minLength: 1, maxLength: 128 }) }),
      },
      security: writeSecurity,
      options: { access: 'internal' },
    },
    router.handleLegacyErrors(async (_context, request, response) =>
      response.ok({
        body: { published: await (await getService(request)).revokeToken(request.params.id) },
      })
    )
  );

  return () => startup.unsubscribe();
};

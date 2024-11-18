/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';

import { appContextService, packagePolicyService } from '..';
import { runWithCache } from '../epm/packages/cache';

const TASK_TYPE = 'fleet:bump_agent_policies';
const BATCH_SIZE = 100;
export function registerBumpAgentPoliciesTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Bump policies',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        let cancelled = false;
        return {
          async run() {
            if (cancelled) {
              throw new Error('Task has been cancelled');
            }

            await runWithCache(async () => {
              await _updatePackagePoliciesThatNeedBump(appContextService.getLogger());

              // TODO agent policies
            });
          },
          async cancel() {
            cancelled = true;
          },
        };
      },
    },
  });
}

async function getPackagePoliciesToBump() {
  return await packagePolicyService.list(appContextService.getInternalUserSOClient(), {
    kuery: 'ingest-package-policies.bump_agent_policy_revision:true',
    perPage: BATCH_SIZE,
  });
}

export async function _updatePackagePoliciesThatNeedBump(logger: Logger) {
  // TODO spaces?
  let packagePoliciesToBump = await getPackagePoliciesToBump();

  logger.info(
    `Found ${packagePoliciesToBump.total} package policies that need agent policy revision bump`
  );

  while (packagePoliciesToBump.total > 0) {
    const start = Date.now();
    // resetting the flag will trigger a revision bump
    await packagePolicyService.bulkUpdate(
      appContextService.getInternalUserSOClient(),
      appContextService.getInternalUserESClient(),
      packagePoliciesToBump.items.map((item) => ({
        ...item,
        bump_agent_policy_revision: false,
      }))
    );
    const updatedCount = packagePoliciesToBump.items.length;

    packagePoliciesToBump = await getPackagePoliciesToBump();
    logger.debug(
      `Updated ${updatedCount} package policies in ${Date.now() - start}ms, ${
        packagePoliciesToBump.total
      } remaining`
    );
  }
}

export async function scheduleBumpAgentPoliciesTask(taskManagerStart: TaskManagerStartContract) {
  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${uuidv4()}`,
    scope: ['fleet'],
    params: {},
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}

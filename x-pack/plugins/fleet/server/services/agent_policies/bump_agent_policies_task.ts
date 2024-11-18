/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import pMap from 'p-map';

import { isEqual, omit } from 'lodash';

import { agentPolicyService, appContextService } from '..';
import { runWithCache } from '../epm/packages/cache';

const TASK_TYPE = 'fleet:bump_agent_policies';

export function registerBumpAgentPoliciesTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Bump policies',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        const agentPolicyIdsWithSpace: Array<{ id: string; spaceId?: string }> =
          taskInstance.params.agentPolicyIdsWithSpace;
        let cancelled = false;
        return {
          async run() {
            if (!agentPolicyIdsWithSpace.length) {
              return;
            }
            appContextService
              .getLogger()
              .debug(`Checking ${agentPolicyIdsWithSpace.length} policies if bump needed`);
            const agentPoliciesIdsIndexedBySpace = agentPolicyIdsWithSpace.reduce(
              (acc, { id, spaceId = DEFAULT_SPACE_ID }) => {
                if (!acc[spaceId]) {
                  acc[spaceId] = [];
                }

                acc[spaceId].push(id);

                return acc;
              },
              {} as { [k: string]: string[] }
            );

            await runWithCache(async () => {
              for (const [spaceId, agentPolicyIds] of Object.entries(
                agentPoliciesIdsIndexedBySpace
              )) {
                if (cancelled) {
                  throw new Error('Task has been cancelled');
                }
                await pMap(
                  agentPolicyIds,
                  async (agentPolicyId) => {
                    _bumpPolicyIfDiffers(
                      appContextService.getLogger(),
                      appContextService.getInternalUserSOClientForSpaceId(spaceId),
                      appContextService.getInternalUserESClient(),
                      agentPolicyId
                    );
                  },
                  { concurrency: 20 }
                );
              }
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

export async function _bumpPolicyIfDiffers(
  logger: Logger,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicyId: string
) {
  // if revision matches, check if SO changed (migrations/backfills)
  const latestFullAgentPolicyFromSO = await agentPolicyService.getFullAgentPolicy(
    soClient,
    agentPolicyId
  );
  const latestFleetPolicy = await agentPolicyService.getLatestFleetPolicy(esClient, agentPolicyId);
  // skip signature comparison, it differes even if there was no change in the SO
  if (
    !isEqual(
      omit(latestFleetPolicy?.data, 'signed.signature'),
      omit(latestFullAgentPolicyFromSO, 'signed.signature')
    )
  ) {
    logger.info(
      `Agent policy ${agentPolicyId} SO has matching revision, but content changed, bumping revision.`
    );
    await agentPolicyService.bumpRevision(soClient, esClient, agentPolicyId, {
      asyncDeploy: false,
    });
  } else {
    logger.debug(`Agent policy ${agentPolicyId} SO has matching revision and content, skipping.`);
  }
}

export async function scheduleBumpAgentPoliciesTask(
  taskManagerStart: TaskManagerStartContract,
  agentPolicyIdsWithSpace: Array<{ id: string; spaceId?: string }>
) {
  if (!agentPolicyIdsWithSpace.length) {
    return;
  }

  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${uuidv4()}`,
    scope: ['fleet'],
    params: { agentPolicyIdsWithSpace },
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}

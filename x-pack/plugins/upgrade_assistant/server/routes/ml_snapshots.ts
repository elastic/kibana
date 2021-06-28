/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { schema } from '@kbn/config-schema';
import { IScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { API_BASE_PATH } from '../../common/constants';
import { MlOperation, ML_UPGRADE_OP_TYPE } from '../../common/types';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { handleEsError } from '../shared_imports';
import { RouteDependencies } from '../types';

const findMlOperation = async (
  savedObjectsClient: SavedObjectsClientContract,
  snapshotId: string
) => {
  return savedObjectsClient.find<MlOperation>({
    type: ML_UPGRADE_OP_TYPE,
    search: `"${snapshotId}"`,
    searchFields: ['snapshotId'],
  });
};

const createMlOperation = async (
  savedObjectsClient: SavedObjectsClientContract,
  attributes: MlOperation
) => {
  const foundSnapshots = await findMlOperation(savedObjectsClient, attributes.snapshotId);

  if (foundSnapshots?.total > 0) {
    throw new Error(`A ML operation is already in progress for snapshot: ${attributes.snapshotId}`);
  }

  return savedObjectsClient.create<MlOperation>(ML_UPGRADE_OP_TYPE, attributes);
};

const deleteMlOperation = (savedObjectsClient: SavedObjectsClientContract, id: string) => {
  return savedObjectsClient.delete(ML_UPGRADE_OP_TYPE, id);
};

/*
 * The tasks API can only tell us if the snapshot upgrade is in progress.
 * We cannot rely on it to determine if a snapshot was upgraded successfully.
 * If the task does not exist, it can mean one of two things:
 *  1. The snapshot was upgraded successfully.
 *  2. There was a failure upgrading the snapshot.
 * In order to verify it was successful, we need to recheck the deprecation info API
 * and verify the deprecation no longer exists. If it still exists, we assume there was a failure.
 */
const verifySnapshotUpgrade = async (
  esClient: IScopedClusterClient,
  snapshot: { snapshotId: string; jobId: string }
): Promise<{
  isSuccessful: boolean;
  error?: ResponseError;
}> => {
  const { snapshotId, jobId } = snapshot;

  try {
    const { body: deprecations } = await esClient.asCurrentUser.migration.deprecations();

    const mlSnapshotDeprecations = deprecations.ml_settings.filter((deprecation) => {
      return /model snapshot/.test(deprecation.message);
    });

    // If there are no ML deprecations, we assume the deprecation was resolved successfully
    if (typeof mlSnapshotDeprecations === 'undefined' || mlSnapshotDeprecations.length === 0) {
      return {
        isSuccessful: true,
      };
    }

    const isSuccessful = Boolean(
      mlSnapshotDeprecations.find((snapshotDeprecation) => {
        const regex = /(?<=\[).*?(?=\])/g;
        const matches = snapshotDeprecation.message.match(regex);

        if (matches?.length === 2) {
          // If there is no matching snapshot, we assume the deprecation was resolved successfully
          return matches[0] === snapshotId && matches[1] === jobId ? false : true;
        }

        return false;
      })
    );

    return {
      isSuccessful,
    };
  } catch (e) {
    return {
      isSuccessful: false,
      error: e,
    };
  }
};

export function registerMlSnapshotRoutes({ router }: RouteDependencies) {
  // Upgrade ML model snapshot
  router.post(
    {
      path: `${API_BASE_PATH}/ml_snapshots`,
      validate: {
        body: schema.object({
          snapshotId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects: { client: savedObjectsClient },
            elasticsearch: { client: esClient },
          },
        },
        request,
        response
      ) => {
        try {
          const { snapshotId, jobId } = request.body;

          const { body } = await esClient.asCurrentUser.ml.upgradeJobSnapshot({
            job_id: jobId,
            snapshot_id: snapshotId,
          });

          const snapshotInfo: MlOperation = {
            nodeId: body.node,
            snapshotId,
            jobId,
          };

          // Store snapshot in saved object if upgrade not complete
          if (body.completed !== true) {
            await createMlOperation(savedObjectsClient, snapshotInfo);
          }

          return response.ok({
            body: {
              ...snapshotInfo,
              status: body.completed === true ? 'complete' : 'in_progress',
            },
          });
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );

  // Get the status of the upgrade snapshot task
  router.get(
    {
      path: `${API_BASE_PATH}/ml_snapshots/{jobId}/{snapshotId}`,
      validate: {
        params: schema.object({
          snapshotId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects: { client: savedObjectsClient },
            elasticsearch: { client: esClient },
          },
        },
        request,
        response
      ) => {
        try {
          const { snapshotId, jobId } = request.params;

          // Verify snapshot exists
          await esClient.asCurrentUser.ml.getModelSnapshots({
            job_id: jobId,
            snapshot_id: snapshotId,
          });

          const foundSnapshots = await findMlOperation(savedObjectsClient, snapshotId);

          // If snapshot is *not* found in SO, assume there has not been an upgrade operation started
          if (typeof foundSnapshots === 'undefined' || foundSnapshots.total === 0) {
            return response.ok({
              body: {
                snapshotId,
                jobId,
                nodeId: undefined,
                status: 'idle',
              },
            });
          }

          const snapshotOp = foundSnapshots.saved_objects[0];
          const { nodeId } = snapshotOp.attributes;

          // Now that we have the node ID, check the upgrade snapshot task progress
          const { body: taskResponse } = await esClient.asCurrentUser.tasks.list({
            nodes: [nodeId],
            actions: 'xpack/ml/job/snapshot/upgrade',
            detailed: true, // necessary in order to filter if there are more than 1 snapshot upgrades in progress
          });

          const nodeTaskInfo = taskResponse?.nodes && taskResponse!.nodes[nodeId];
          const snapshotInfo: MlOperation = {
            ...snapshotOp.attributes,
          };

          if (nodeTaskInfo) {
            // Find the correct snapshot task ID based on the task description
            const snapshotTaskId = Object.keys(nodeTaskInfo.tasks).find((task) => {
              // The description is in the format of "job-snapshot-upgrade-<job_id>-<snapshot_id>"
              const taskDescription = nodeTaskInfo.tasks[task].description;
              const taskSnapshotAndJobIds = taskDescription!.replace('job-snapshot-upgrade-', '');
              const taskSnapshotAndJobIdParts = taskSnapshotAndJobIds.split('-');
              const taskSnapshotId =
                taskSnapshotAndJobIdParts[taskSnapshotAndJobIdParts.length - 1];
              const taskJobId = taskSnapshotAndJobIdParts.slice(0, 1).join('-');

              return taskSnapshotId === snapshotId && taskJobId === jobId;
            });

            // If the snapshot task exists, assume the upgrade is in progress
            if (snapshotTaskId && nodeTaskInfo.tasks[snapshotTaskId]) {
              return response.ok({
                body: {
                  ...snapshotInfo,
                  status: 'in_progress',
                },
              });
            } else {
              // The task ID was not found; verify the deprecation was resolved
              const {
                isSuccessful: isSnapshotDeprecationResolved,
                error: upgradeSnapshotError,
              } = await verifySnapshotUpgrade(esClient, {
                snapshotId,
                jobId,
              });

              // Delete the SO; if it's complete, no need to store it anymore. If there's an error, this will give the user a chance to retry
              await deleteMlOperation(savedObjectsClient, snapshotOp.id);

              if (isSnapshotDeprecationResolved) {
                return response.ok({
                  body: {
                    ...snapshotInfo,
                    status: 'complete',
                  },
                });
              }

              return response.customError({
                statusCode: upgradeSnapshotError ? upgradeSnapshotError.statusCode : 500,
                body: {
                  message:
                    upgradeSnapshotError?.body?.error?.reason ||
                    'There was an error upgrading your snapshot. Check the Elasticsearch logs for more details.',
                },
              });
            }
          } else {
            // No tasks found; verify the deprecation was resolved
            const {
              isSuccessful: isSnapshotDeprecationResolved,
              error: upgradeSnapshotError,
            } = await verifySnapshotUpgrade(esClient, {
              snapshotId,
              jobId,
            });

            // Delete the SO; if it's complete, no need to store it anymore. If there's an error, this will give the user a chance to retry
            await deleteMlOperation(savedObjectsClient, snapshotOp.id);

            if (isSnapshotDeprecationResolved) {
              return response.ok({
                body: {
                  ...snapshotInfo,
                  status: 'complete',
                },
              });
            }

            return response.customError({
              statusCode: upgradeSnapshotError ? upgradeSnapshotError.statusCode : 500,
              body: {
                message:
                  upgradeSnapshotError?.body?.error?.reason ||
                  'There was an error upgrading your snapshot. Check the Elasticsearch logs for more details.',
              },
            });
          }
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );

  // Delete ML model snapshot
  router.delete(
    {
      path: `${API_BASE_PATH}/ml_snapshots/{jobId}/{snapshotId}`,
      validate: {
        params: schema.object({
          snapshotId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const { snapshotId, jobId } = request.params;

          const {
            body: deleteSnapshotResponse,
          } = await client.asCurrentUser.ml.deleteModelSnapshot({
            job_id: jobId,
            snapshot_id: snapshotId,
          });

          return response.ok({
            body: deleteSnapshotResponse,
          });
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsClientContract } from 'kibana/server';
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

  if (foundSnapshots.total !== 0) {
    const existingOp = foundSnapshots.saved_objects[0];

    if (existingOp.attributes.status === 'error') {
      // Delete the existing one if it failed to give a chance to retry.
      await deleteMlOperation(savedObjectsClient, existingOp.id);
    } else {
      throw new Error(
        `A ML operation is already in progress for snapshot ${attributes.snapshotId}`
      );
    }
  }

  return savedObjectsClient.create<MlOperation>(ML_UPGRADE_OP_TYPE, attributes);
};

const deleteMlOperation = (savedObjectsClient: SavedObjectsClientContract, id: string) => {
  return savedObjectsClient.delete(ML_UPGRADE_OP_TYPE, id);
};

const updateMlOperation = (
  savedObjectsClient: SavedObjectsClientContract,
  id: string,
  newAttributes: MlOperation
) => {
  return savedObjectsClient.update(ML_UPGRADE_OP_TYPE, id, newAttributes);
};

export function registerMlSnapshotRoutes({ router }: RouteDependencies) {
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

          const upgradeSnapshotResponse: MlOperation = {
            nodeId: body.node,
            snapshotId,
            jobId,
            status: body.completed === true ? 'complete' : 'in_progress',
          };

          // Store current status in saved object
          await createMlOperation(savedObjectsClient, upgradeSnapshotResponse);

          return response.ok({
            body: upgradeSnapshotResponse,
          });
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );

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

          // If snapshot is not found, assume there has not been an upgrade operation started
          if (foundSnapshots.total === 0) {
            return response.ok({
              body: {
                snapshotId,
                jobId,
                status: 'idle',
                nodeId: undefined,
              },
            });
          }

          const snapshotOp = foundSnapshots.saved_objects[0];
          const { nodeId } = snapshotOp.attributes;

          // Check upgrade snapshot task progress
          const { body: taskResponse } = await esClient.asCurrentUser.tasks.list({
            nodes: [nodeId],
            actions: 'xpack/ml/job/snapshot/upgrade',
            detailed: true, // necessary in order to filter if there are more than 1 snapshot upgrades in progress
          });

          const nodeTaskInfo = taskResponse?.nodes && taskResponse!.nodes[nodeId];
          let statusResponse: MlOperation = {
            ...snapshotOp.attributes,
          };

          if (nodeTaskInfo) {
            const snapshotTaskId = Object.keys(nodeTaskInfo.tasks).find((task) => {
              const taskDescription = nodeTaskInfo.tasks[task].description;
              const taskSnapshotAndJobIds = taskDescription!.replace('job-snapshot-upgrade-', '');
              const taskSnapshotAndJobIdParts = taskSnapshotAndJobIds.split('-');
              const taskSnapshotId =
                taskSnapshotAndJobIdParts[taskSnapshotAndJobIdParts.length - 1];
              const taskJobId = taskSnapshotAndJobIdParts.slice(0, 1).join('-');

              return taskSnapshotId === snapshotId && taskJobId === jobId;
            });

            if (snapshotTaskId) {
              const snapshotTaskStatus = nodeTaskInfo.tasks[snapshotTaskId].status;

              // TODO: look into other possible states and handle accordingly
              // TODO: Open issues against es-js client to update task status interface
              // @ts-expect-error
              if (snapshotTaskStatus?.state === 'STARTED') {
                statusResponse = {
                  ...statusResponse,
                  status: 'in_progress',
                };
                await updateMlOperation(savedObjectsClient, snapshotOp.id, statusResponse);
              }
            }
          } else {
            // Assume snapshot has completed if response has no running tasks
            statusResponse = {
              ...statusResponse,
              status: 'complete',
            };
            await updateMlOperation(savedObjectsClient, snapshotOp.id, statusResponse);
          }

          return response.ok({
            body: statusResponse,
          });
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );

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

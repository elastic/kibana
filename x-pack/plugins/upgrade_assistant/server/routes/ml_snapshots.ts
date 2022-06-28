/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { TransportResult } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';

import { API_BASE_PATH } from '../../common/constants';
import { MlOperation, ML_UPGRADE_OP_TYPE } from '../../common/types';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
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
  error?: errors.ResponseError;
}> => {
  const { snapshotId, jobId } = snapshot;

  try {
    const deprecations = await esClient.asCurrentUser.migration.deprecations();

    const mlSnapshotDeprecations = deprecations.ml_settings.filter((deprecation) => {
      return /[Mm]odel snapshot/.test(deprecation.message);
    });

    // If there are no ML deprecations, we assume the deprecation was resolved successfully
    if (typeof mlSnapshotDeprecations === 'undefined' || mlSnapshotDeprecations.length === 0) {
      return {
        isSuccessful: true,
      };
    }

    const isSuccessful = Boolean(
      mlSnapshotDeprecations.find((snapshotDeprecation) => {
        // This regex will match all the bracket pairs from the deprecation message, at the moment
        // that should match 3 pairs: snapshotId, jobId and version in which the snapshot was made.
        const regex = /(?<=\[).*?(?=\])/g;
        const matches = snapshotDeprecation.message.match(regex);

        if (matches?.length === 3) {
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

interface ModelSnapshotUpgradeStatus {
  model_snapshot_upgrades: Array<{
    state: 'saving_new_state' | 'loading_old_state' | 'stopped' | 'failed';
  }>;
}

const getModelSnapshotUpgradeStatus = async (
  esClient: IScopedClusterClient,
  jobId: string,
  snapshotId: string
) => {
  try {
    const { body } = (await esClient.asCurrentUser.transport.request(
      {
        method: 'GET',
        path: `/_ml/anomaly_detectors/${jobId}/model_snapshots/${snapshotId}/_upgrade/_stats`,
      },
      { meta: true }
    )) as TransportResult<ModelSnapshotUpgradeStatus>;

    return body && body.model_snapshot_upgrades[0];
  } catch (err) {
    // If the api returns a 404 then it means that the model snapshot upgrade that was started
    // doesn't exist. Since the start migration call returned success, this means the upgrade must have
    // completed, so the upgrade assistant can continue to use its current logic. Otherwise we re-throw
    // the exception so that it can be caught at route level.
    if (err.statusCode !== 404) {
      throw err;
    }
  }
};

export function registerMlSnapshotRoutes({
  router,
  log,
  lib: { handleEsError },
}: RouteDependencies) {
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
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          savedObjects: { client: savedObjectsClient },
          elasticsearch: { client: esClient },
        } = await core;
        const { snapshotId, jobId } = request.body;

        const body = await esClient.asCurrentUser.ml.upgradeJobSnapshot({
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
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
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
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          savedObjects: { client: savedObjectsClient },
          elasticsearch: { client: esClient },
        } = await core;
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

        const upgradeStatus = await getModelSnapshotUpgradeStatus(esClient, jobId, snapshotId);
        // Create snapshotInfo payload to send back in the response
        const snapshotOp = foundSnapshots.saved_objects[0];
        const snapshotInfo: MlOperation = {
          ...snapshotOp.attributes,
        };

        if (upgradeStatus) {
          if (
            upgradeStatus.state === 'loading_old_state' ||
            upgradeStatus.state === 'saving_new_state'
          ) {
            return response.ok({
              body: {
                ...snapshotInfo,
                status: 'in_progress',
              },
            });
          } else if (upgradeStatus.state === 'failed') {
            return response.customError({
              statusCode: 500,
              body: {
                message: i18n.translate(
                  'xpack.upgradeAssistant.ml_snapshots.modelSnapshotUpgradeFailed',
                  {
                    defaultMessage:
                      'The upgrade process for this model snapshot failed. Check the Elasticsearch logs for more details.',
                  }
                ),
              },
            });
          } else {
            // The task ID was not found; verify the deprecation was resolved
            const { isSuccessful: isSnapshotDeprecationResolved, error: upgradeSnapshotError } =
              await verifySnapshotUpgrade(esClient, {
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
              statusCode: upgradeSnapshotError ? upgradeSnapshotError.statusCode! : 500,
              body: {
                message:
                  upgradeSnapshotError?.body?.error?.reason ||
                  'The upgrade process for this model snapshot stopped yet the snapshot is not upgraded. Check the Elasticsearch logs for more details.',
              },
            });
          }
        } else {
          // No tasks found; verify the deprecation was resolved
          const { isSuccessful: isSnapshotDeprecationResolved, error: upgradeSnapshotError } =
            await verifySnapshotUpgrade(esClient, {
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

          log.error(
            `Failed to determine status of the ML model upgrade, upgradeStatus is not defined and snapshot upgrade is not completed. snapshotId=${snapshotId} and jobId=${jobId}`
          );
          return response.customError({
            statusCode: upgradeSnapshotError ? upgradeSnapshotError.statusCode! : 500,
            body: {
              message:
                upgradeSnapshotError?.body?.error?.reason ||
                'The upgrade process for this model snapshot completed yet the snapshot is not upgraded. Check the Elasticsearch logs for more details.',
            },
          });
        }
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );

  // Get the ml upgrade mode
  router.get(
    {
      path: `${API_BASE_PATH}/ml_upgrade_mode`,
      validate: false,
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client: esClient },
        } = await core;
        const mlInfo = await esClient.asCurrentUser.ml.info();

        return response.ok({
          body: {
            mlUpgradeModeEnabled: mlInfo.upgrade_mode,
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
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
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;
        const { snapshotId, jobId } = request.params;

        const deleteSnapshotResponse = await client.asCurrentUser.ml.deleteModelSnapshot({
          job_id: jobId,
          snapshot_id: snapshotId,
        });

        return response.ok({
          body: deleteSnapshotResponse,
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}

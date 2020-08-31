/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import {
  DeleteTransformEndpointResult,
  DeleteTransformStatus,
  TransformEndpointRequest,
} from '../../../common';
import { extractErrorMessage, getErrorMessage } from '../../shared_imports';
import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { REFRESH_TRANSFORM_LIST_STATE, refreshTransformList$, TransformListRow } from '../common';
import { ToastNotificationText } from '../components';
import { useApi } from './use_api';
import { indexService } from '../services/es_index_service';

export const useDeleteIndexAndTargetIndex = (items: TransformListRow[]) => {
  const { http, savedObjects } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const [deleteDestIndex, setDeleteDestIndex] = useState<boolean>(true);
  const [deleteIndexPattern, setDeleteIndexPattern] = useState<boolean>(true);
  const [userCanDeleteIndex, setUserCanDeleteIndex] = useState<boolean>(false);
  const [indexPatternExists, setIndexPatternExists] = useState<boolean>(false);

  const toggleDeleteIndex = useCallback(() => setDeleteDestIndex(!deleteDestIndex), [
    deleteDestIndex,
  ]);
  const toggleDeleteIndexPattern = useCallback(() => setDeleteIndexPattern(!deleteIndexPattern), [
    deleteIndexPattern,
  ]);
  const checkIndexPatternExists = useCallback(
    async (indexName: string) => {
      try {
        if (await indexService.indexPatternExists(savedObjects.client, indexName)) {
          setIndexPatternExists(true);
        }
      } catch (e) {
        const error = extractErrorMessage(e);

        toastNotifications.addDanger(
          i18n.translate(
            'xpack.transform.deleteTransform.errorWithCheckingIfIndexPatternExistsNotificationErrorMessage',
            {
              defaultMessage:
                'An error occurred checking if index pattern {indexPattern} exists: {error}',
              values: { indexPattern: indexName, error },
            }
          )
        );
      }
    },
    [savedObjects.client, toastNotifications]
  );

  const checkUserIndexPermission = useCallback(async () => {
    try {
      const userCanDelete = await indexService.canDeleteIndex(http);
      if (userCanDelete) {
        setUserCanDeleteIndex(true);
      }
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.transform.transformList.errorWithCheckingIfUserCanDeleteIndexNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred checking if user can delete destination index',
          }
        )
      );
    }
  }, [http, toastNotifications]);

  useEffect(() => {
    checkUserIndexPermission();

    // if user only deleting one transform
    if (items.length === 1) {
      const config = items[0].config;
      const destinationIndex = Array.isArray(config.dest.index)
        ? config.dest.index[0]
        : config.dest.index;
      checkIndexPatternExists(destinationIndex);
    } else {
      setIndexPatternExists(true);
    }
  }, [checkIndexPatternExists, checkUserIndexPermission, items]);

  return {
    userCanDeleteIndex,
    deleteDestIndex,
    indexPatternExists,
    deleteIndexPattern,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
  };
};

type SuccessCountField = keyof Omit<DeleteTransformStatus, 'destinationIndex'>;

export const useDeleteTransforms = () => {
  const { overlays } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (
    transforms: TransformListRow[],
    shouldDeleteDestIndex: boolean,
    shouldDeleteDestIndexPattern: boolean,
    shouldForceDelete = false
  ) => {
    const transformsInfo: TransformEndpointRequest[] = transforms.map((tf) => ({
      id: tf.config.id,
      state: tf.stats.state,
    }));

    try {
      const results: DeleteTransformEndpointResult = await api.deleteTransforms(
        transformsInfo,
        shouldDeleteDestIndex,
        shouldDeleteDestIndexPattern,
        shouldForceDelete
      );
      const isBulk = Object.keys(results).length > 1;
      const successCount: Record<SuccessCountField, number> = {
        transformDeleted: 0,
        destIndexDeleted: 0,
        destIndexPatternDeleted: 0,
      };
      for (const transformId in results) {
        // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
        if (results.hasOwnProperty(transformId)) {
          const status = results[transformId];
          const destinationIndex = status.destinationIndex;

          // if we are only deleting one transform, show the success toast messages
          if (!isBulk && status.transformDeleted) {
            if (status.transformDeleted?.success) {
              toastNotifications.addSuccess(
                i18n.translate('xpack.transform.transformList.deleteTransformSuccessMessage', {
                  defaultMessage: 'Request to delete transform {transformId} acknowledged.',
                  values: { transformId },
                })
              );
            }
            if (status.destIndexDeleted?.success) {
              toastNotifications.addSuccess(
                i18n.translate(
                  'xpack.transform.deleteTransform.deleteAnalyticsWithIndexSuccessMessage',
                  {
                    defaultMessage:
                      'Request to delete destination index {destinationIndex} acknowledged.',
                    values: { destinationIndex },
                  }
                )
              );
            }
            if (status.destIndexPatternDeleted?.success) {
              toastNotifications.addSuccess(
                i18n.translate(
                  'xpack.transform.deleteTransform.deleteAnalyticsWithIndexPatternSuccessMessage',
                  {
                    defaultMessage:
                      'Request to delete index pattern {destinationIndex} acknowledged.',
                    values: { destinationIndex },
                  }
                )
              );
            }
          } else {
            (Object.keys(successCount) as SuccessCountField[]).forEach((key) => {
              if (status[key]?.success) {
                successCount[key] = successCount[key] + 1;
              }
            });
          }
          if (status.transformDeleted?.error) {
            const error = extractErrorMessage(status.transformDeleted.error);
            toastNotifications.addDanger({
              title: i18n.translate('xpack.transform.transformList.deleteTransformErrorMessage', {
                defaultMessage: 'An error occurred deleting the transform {transformId}',
                values: { transformId },
              }),
              text: toMountPoint(
                <ToastNotificationText previewTextLength={50} overlays={overlays} text={error} />
              ),
            });
          }

          if (status.destIndexDeleted?.error) {
            const error = extractErrorMessage(status.destIndexDeleted.error);
            toastNotifications.addDanger({
              title: i18n.translate(
                'xpack.transform.deleteTransform.deleteAnalyticsWithIndexErrorMessage',
                {
                  defaultMessage: 'An error occurred deleting destination index {destinationIndex}',
                  values: { destinationIndex },
                }
              ),
              text: toMountPoint(
                <ToastNotificationText previewTextLength={50} overlays={overlays} text={error} />
              ),
            });
          }

          if (status.destIndexPatternDeleted?.error) {
            const error = extractErrorMessage(status.destIndexPatternDeleted.error);
            toastNotifications.addDanger({
              title: i18n.translate(
                'xpack.transform.deleteTransform.deleteAnalyticsWithIndexPatternErrorMessage',
                {
                  defaultMessage: 'An error occurred deleting index pattern {destinationIndex}',
                  values: { destinationIndex },
                }
              ),
              text: toMountPoint(
                <ToastNotificationText previewTextLength={50} overlays={overlays} text={error} />
              ),
            });
          }
        }
      }

      // if we are deleting multiple transforms, combine the success messages
      if (isBulk) {
        if (successCount.transformDeleted > 0) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.bulkDeleteTransformSuccessMessage', {
              defaultMessage:
                'Successfully deleted {count} {count, plural, one {transform} other {transforms}}.',
              values: { count: successCount.transformDeleted },
            })
          );
        }

        if (successCount.destIndexDeleted > 0) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.bulkDeleteDestIndexSuccessMessage', {
              defaultMessage:
                'Successfully deleted {count} destination {count, plural, one {index} other {indices}}.',
              values: { count: successCount.destIndexDeleted },
            })
          );
        }
        if (successCount.destIndexPatternDeleted > 0) {
          toastNotifications.addSuccess(
            i18n.translate(
              'xpack.transform.transformList.bulkDeleteDestIndexPatternSuccessMessage',
              {
                defaultMessage:
                  'Successfully deleted {count} destination index {count, plural, one {pattern} other {patterns}}.',
                values: { count: successCount.destIndexPatternDeleted },
              }
            )
          );
        }
      }

      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.deleteTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to delete transforms.',
        }),
        text: toMountPoint(
          <ToastNotificationText
            previewTextLength={50}
            overlays={overlays}
            text={getErrorMessage(e)}
          />
        ),
      });
    }
  };
};

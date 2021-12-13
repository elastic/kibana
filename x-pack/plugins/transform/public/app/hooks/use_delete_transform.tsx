/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import type {
  DeleteTransformStatus,
  DeleteTransformsRequestSchema,
} from '../../../common/api_schemas/delete_transforms';
import { isDeleteTransformsResponseSchema } from '../../../common/api_schemas/type_guards';
import { getErrorMessage } from '../../../common/utils/errors';
import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { REFRESH_TRANSFORM_LIST_STATE, refreshTransformList$, TransformListRow } from '../common';
import { ToastNotificationText } from '../components';
import { useApi } from './use_api';
import { indexService } from '../services/es_index_service';

export const useDeleteIndexAndTargetIndex = (items: TransformListRow[]) => {
  const {
    http,
    savedObjects,
    ml: { extractErrorMessage },
    application: { capabilities },
  } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const [deleteDestIndex, setDeleteDestIndex] = useState<boolean>(true);
  const [deleteIndexPattern, setDeleteIndexPattern] = useState<boolean>(true);
  const [userCanDeleteIndex, setUserCanDeleteIndex] = useState<boolean>(false);
  const [indexPatternExists, setIndexPatternExists] = useState<boolean>(false);
  const [userCanDeleteDataView, setUserCanDeleteDataView] = useState<boolean>(false);

  const toggleDeleteIndex = useCallback(
    () => setDeleteDestIndex(!deleteDestIndex),
    [deleteDestIndex]
  );
  const toggleDeleteIndexPattern = useCallback(
    () => setDeleteIndexPattern(!deleteIndexPattern),
    [deleteIndexPattern]
  );
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
            'xpack.transform.deleteTransform.errorWithCheckingIfDataViewExistsNotificationErrorMessage',
            {
              defaultMessage: 'An error occurred checking if data view {dataView} exists: {error}',
              values: { dataView: indexName, error },
            }
          )
        );
      }
    },
    [savedObjects.client, toastNotifications, extractErrorMessage]
  );

  const checkUserIndexPermission = useCallback(async () => {
    try {
      const userCanDelete = await indexService.canDeleteIndex(http);
      if (userCanDelete) {
        setUserCanDeleteIndex(true);
      }
      const canDeleteDataView =
        capabilities.savedObjectsManagement.delete === true ||
        capabilities.indexPatterns.save === true;
      setUserCanDeleteDataView(canDeleteDataView);
      if (canDeleteDataView === false) {
        setDeleteIndexPattern(false);
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
  }, [http, toastNotifications, capabilities]);

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
    userCanDeleteDataView,
    deleteDestIndex,
    indexPatternExists,
    deleteIndexPattern,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
  };
};

type SuccessCountField = keyof Omit<DeleteTransformStatus, 'destinationIndex'>;

export const useDeleteTransforms = () => {
  const { overlays, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (reqBody: DeleteTransformsRequestSchema) => {
    const results = await api.deleteTransforms(reqBody);

    if (!isDeleteTransformsResponseSchema(results)) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.deleteTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to delete transforms.',
        }),
        text: toMountPoint(
          <ToastNotificationText
            previewTextLength={50}
            overlays={overlays}
            theme={theme}
            text={getErrorMessage(results)}
          />,
          { theme$: theme.theme$ }
        ),
      });
      return;
    }

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
                'xpack.transform.deleteTransform.deleteAnalyticsWithDataViewSuccessMessage',
                {
                  defaultMessage: 'Request to delete data view {destinationIndex} acknowledged.',
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
          const error = status.transformDeleted.error.reason;
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.transformList.deleteTransformErrorMessage', {
              defaultMessage: 'An error occurred deleting the transform {transformId}',
              values: { transformId },
            }),
            text: toMountPoint(
              <ToastNotificationText
                previewTextLength={50}
                overlays={overlays}
                theme={theme}
                text={error}
              />,
              { theme$: theme.theme$ }
            ),
          });
        }

        if (status.destIndexDeleted?.error) {
          const error = status.destIndexDeleted.error.reason;
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.transform.deleteTransform.deleteAnalyticsWithIndexErrorMessage',
              {
                defaultMessage: 'An error occurred deleting destination index {destinationIndex}',
                values: { destinationIndex },
              }
            ),
            text: toMountPoint(
              <ToastNotificationText
                previewTextLength={50}
                overlays={overlays}
                theme={theme}
                text={error}
              />,
              { theme$: theme.theme$ }
            ),
          });
        }

        if (status.destIndexPatternDeleted?.error) {
          const error = status.destIndexPatternDeleted.error.reason;
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.transform.deleteTransform.deleteAnalyticsWithDataViewErrorMessage',
              {
                defaultMessage: 'An error occurred deleting data view {destinationIndex}',
                values: { destinationIndex },
              }
            ),
            text: toMountPoint(
              <ToastNotificationText
                previewTextLength={50}
                overlays={overlays}
                theme={theme}
                text={error}
              />,
              { theme$: theme.theme$ }
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
          i18n.translate('xpack.transform.transformList.bulkDeleteDestDataViewSuccessMessage', {
            defaultMessage:
              'Successfully deleted {count} destination data {count, plural, one {view} other {views}}.',
            values: { count: successCount.destIndexPatternDeleted },
          })
        );
      }
    }

    refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
  };
};

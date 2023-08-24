/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import { addInternalBasePath } from '../../../common/constants';
import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../common/api_schemas/delete_transforms';
import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { useAuthorization } from './use_authorization';
import { useDataViewExists } from './use_data_view_exists';
import { useRefreshTransformList, type TransformListRow } from '../common';
import { ToastNotificationText } from '../components';

export const useDeleteIndexAndTargetIndex = (items: TransformListRow[]) => {
  const {
    application: { capabilities },
  } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const userCanDeleteDataView =
    (capabilities.savedObjectsManagement && capabilities.savedObjectsManagement.delete === true) ||
    (capabilities.indexPatterns && capabilities.indexPatterns.save === true);

  const [deleteDestIndex, setDeleteDestIndex] = useState<boolean>(true);
  const [deleteDataView, setDeleteDataView] = useState<boolean>(userCanDeleteDataView);

  const { error: canDeleteIndexError, privileges } = useAuthorization();
  const userCanDeleteIndex = privileges.hasAllPrivileges;

  useEffect(() => {
    if (canDeleteIndexError !== null) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.transform.transformList.errorWithCheckingIfUserCanDeleteIndexNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred checking if user can delete destination index',
          }
        )
      );
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDeleteIndexError]);

  const toggleDeleteIndex = useCallback(
    () => setDeleteDestIndex(!deleteDestIndex),
    [deleteDestIndex]
  );
  const toggleDeleteDataView = useCallback(
    () => setDeleteDataView(!deleteDataView),
    [deleteDataView]
  );

  const indexName = useMemo<string | undefined>(() => {
    // if user only deleting one transform
    if (items.length === 1) {
      const config = items[0].config;
      return Array.isArray(config.dest.index) ? config.dest.index[0] : config.dest.index;
    }
  }, [items]);

  const { error: dataViewExistsError, data: dataViewExists } = useDataViewExists(
    indexName,
    items.length === 1,
    items.length !== 1
  );

  useEffect(() => {
    if (dataViewExistsError !== null) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.transform.deleteTransform.errorWithCheckingIfDataViewExistsNotificationErrorMessage',
          {
            defaultMessage: 'An error occurred checking if data view {dataView} exists: {error}',
            values: {
              dataView: indexName,
              error: extractErrorMessage(dataViewExistsError),
            },
          }
        )
      );
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewExistsError]);

  return {
    userCanDeleteIndex,
    userCanDeleteDataView,
    deleteDestIndex,
    dataViewExists,
    deleteDataView,
    toggleDeleteIndex,
    toggleDeleteDataView,
  };
};

export const useDeleteTransforms = () => {
  const { http, overlays, theme } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();

  const mutation = useMutation({
    mutationFn: (reqBody: DeleteTransformsRequestSchema) =>
      http.post<DeleteTransformsResponseSchema>(addInternalBasePath('delete_transforms'), {
        body: JSON.stringify(reqBody),
        version: '1',
      }),
    onError: (error) =>
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.deleteTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to delete transforms.',
        }),
        text: toMountPoint(
          <ToastNotificationText
            previewTextLength={50}
            overlays={overlays}
            theme={theme}
            text={getErrorMessage(error)}
          />,
          { theme$: theme.theme$ }
        ),
      }),
    onSuccess: (results) => {
      for (const transformId in results) {
        // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
        if (results.hasOwnProperty(transformId)) {
          const status = results[transformId];
          const destinationIndex = status.destinationIndex;

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

          if (status.destDataViewDeleted?.error) {
            const error = status.destDataViewDeleted.error.reason;
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

      refreshTransformList();
    },
  });

  return mutation.mutate;
};

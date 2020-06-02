/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';
import { CoreSetup } from 'kibana/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

import { TransformEndpointRequest, DeleteTransformEndpointResult } from '../../../common';

import { getErrorMessage } from '../../shared_imports';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { TransformListRow, refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../common';
import { ToastNotificationText } from '../components';

import { useApi } from './use_api';
import { API_BASE_PATH } from '../../../common/constants';
import { IIndexPattern } from '../../../../../../src/plugins/data/common/index_patterns';

export const extractErrorMessage = (
  error: CustomHttpResponseOptions<ResponseError> | undefined | string
): string | undefined => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.body) {
    if (typeof error.body === 'string') {
      return error.body;
    }
    if (typeof error.body === 'object' && 'message' in error.body) {
      if (typeof error.body.message === 'string') {
        return error.body.message;
      }
      // @ts-ignore
      if (typeof (error.body.message?.msg === 'string')) {
        // @ts-ignore
        return error.body.message?.msg;
      }
    }
    if (typeof error.body === 'object' && 'msg' in error.body) {
      // @ts-ignore
      if (typeof error.body.msg === 'string') {
        // @ts-ignore
        return error.body.msg;
      }
    }
  }
  return undefined;
};

export const canDeleteIndex = async (http: CoreSetup['http']) => {
  const privilege = await http.get(`${API_BASE_PATH}privileges`);
  if (!privilege) {
    return false;
  }
  return privilege.hasAllPrivileges;
};

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
  const savedObjectsClient = savedObjects.client;

  const checkIndexPatternExists = useCallback(
    async (indexName: string) => {
      try {
        const response = await savedObjectsClient.find<IIndexPattern>({
          type: 'index-pattern',
          perPage: 10,
          search: `"${indexName}"`,
          searchFields: ['title'],
          fields: ['title'],
        });
        const ip = response.savedObjects.find(
          (obj) => obj.attributes.title.toLowerCase() === indexName.toLowerCase()
        );
        if (ip !== undefined) {
          setIndexPatternExists(true);
        }
      } catch (e) {
        const error = extractErrorMessage(e);

        toastNotifications.addDanger(
          i18n.translate(
            'xpack.ml.dataframe.analyticsList.errorWithCheckingIfIndexPatternExistsNotificationErrorMessage',
            {
              defaultMessage:
                'An error occurred checking if index pattern {indexPattern} exists: {error}',
              values: { indexPattern: indexName, error },
            }
          )
        );
      }
    },
    [savedObjectsClient, toastNotifications]
  );

  const checkUserIndexPermission = useCallback(() => {
    try {
      const userCanDelete = canDeleteIndex(http);
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

export const useDeleteTransforms = () => {
  const { overlays } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (
    transforms: TransformListRow[],
    shouldDeleteDestIndex: boolean,
    shouldDeleteDestIndexPattern: boolean
  ) => {
    const transformsInfo: TransformEndpointRequest[] = transforms.map((tf) => ({
      id: tf.config.id,
      state: tf.stats.state,
    }));

    try {
      const results: DeleteTransformEndpointResult = await api.deleteTransforms(
        transformsInfo,
        shouldDeleteDestIndex,
        shouldDeleteDestIndexPattern
      );
      const isBulk = Object.keys(results).length > 1;
      const successCount: Record<string, number> = {
        transformJobDeleted: 0,
        destIndexDeleted: 0,
        destIndexPatternDeleted: 0,
      };
      for (const transformId in results) {
        // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
        if (results.hasOwnProperty(transformId)) {
          const status = results[transformId];
          const destinationIndex = status.destinationIndex;

          // if we are only deleting one modal, show the success toast messages
          if (!isBulk) {
            if (status.transformJobDeleted?.success) {
              toastNotifications.addSuccess(
                i18n.translate('xpack.transform.transformList.deleteTransformSuccessMessage', {
                  defaultMessage: 'Request to delete transform job {transformId} acknowledged.',
                  values: { transformId },
                })
              );
            }
            if (status.destIndexDeleted?.success) {
              toastNotifications.addSuccess(
                i18n.translate(
                  'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexSuccessMessage',
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
                  'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexPatternSuccessMessage',
                  {
                    defaultMessage:
                      'Request to delete index pattern {destinationIndex} acknowledged.',
                    values: { destinationIndex },
                  }
                )
              );
            }
          } else {
            Object.keys(successCount).forEach((key) => {
              // @ts-ignore
              if (status[key]?.success) {
                successCount[key] = successCount[key] + 1;
              }
            });
          }
          if (status.transformJobDeleted?.error) {
            const error = extractErrorMessage(status.transformJobDeleted.error);
            toastNotifications.addDanger({
              title: i18n.translate('xpack.transform.transformList.deleteTransformErrorMessage', {
                defaultMessage:
                  'An error occurred deleting the data frame analytics job {transformId}',
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
                'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexErrorMessage',
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
                'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexPatternErrorMessage',
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

      if (isBulk) {
        if (successCount.transformJobDeleted > 0) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.deleteTransformSuccessMessage', {
              defaultMessage:
                'Successfully deleted {count} transform {count, plural, one {job} other {jobs}}.',
              values: { count: successCount.transformJobDeleted },
            })
          );
        }

        if (successCount.destIndexDeleted > 0) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.deleteTransformSuccessMessage', {
              defaultMessage:
                'Successfully deleted {count} destination {count, plural, one {index} other {indices}}.',
              values: { count: successCount.destIndexDeleted },
            })
          );
        }
        if (successCount.destIndexPatternDeleted > 0) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.deleteTransformSuccessMessage', {
              defaultMessage:
                'Successfully deleted {count} destination index {count, plural, one {pattern} other {patterns}}.',
              values: { count: successCount.destIndexPatternDeleted },
            })
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

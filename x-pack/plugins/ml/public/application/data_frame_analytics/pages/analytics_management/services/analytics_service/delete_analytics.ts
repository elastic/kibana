/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import { useMlApiContext } from '../../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';
import { refreshAnalyticsList$, REFRESH_ANALYTICS_LIST_STATE } from '../../../../common';
import type { DataFrameAnalyticsListRow } from '../../components/analytics_list/common';

export const useDeleteAnalytics = () => {
  const toastNotificationService = useToastNotificationService();
  const ml = useMlApiContext();

  return async (analyticsConfig: DataFrameAnalyticsListRow['config']) => {
    try {
      await ml.dataFrameAnalytics.deleteDataFrameAnalytics(analyticsConfig.id);
      toastNotificationService.displaySuccessToast(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
          defaultMessage: 'Request to delete data frame analytics job {analyticsId} acknowledged.',
          values: { analyticsId: analyticsConfig.id },
        })
      );
    } catch (e) {
      toastNotificationService.displayErrorToast(
        e,
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
          defaultMessage: 'An error occurred deleting the data frame analytics job {analyticsId}',
          values: { analyticsId: analyticsConfig.id },
        })
      );
    }
    refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
  };
};

export const useDeleteAnalyticsAndDestIndex = () => {
  const toastNotificationService = useToastNotificationService();
  const ml = useMlApiContext();

  return async (
    analyticsConfig: DataFrameAnalyticsListRow['config'],
    deleteDestIndex: boolean,
    deleteDestDataView: boolean
  ) => {
    const destinationIndex = analyticsConfig.dest.index;
    try {
      const status = await ml.dataFrameAnalytics.deleteDataFrameAnalyticsAndDestIndex(
        analyticsConfig.id,
        deleteDestIndex,
        deleteDestDataView
      );
      if (status.analyticsJobDeleted?.success) {
        toastNotificationService.displaySuccessToast(
          i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
            defaultMessage:
              'Request to delete data frame analytics job {analyticsId} acknowledged.',
            values: { analyticsId: analyticsConfig.id },
          })
        );
      }
      if (status.analyticsJobDeleted?.error) {
        toastNotificationService.displayErrorToast(
          status.analyticsJobDeleted.error,
          i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
            defaultMessage: 'An error occurred deleting the data frame analytics job {analyticsId}',
            values: { analyticsId: analyticsConfig.id },
          })
        );
      }

      if (status.destIndexDeleted?.success) {
        toastNotificationService.displaySuccessToast(
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
      if (status.destIndexDeleted?.error) {
        toastNotificationService.displayErrorToast(
          status.destIndexDeleted.error,
          i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexErrorMessage', {
            defaultMessage: 'An error occurred deleting destination index {destinationIndex}',
            values: { destinationIndex },
          })
        );
      }

      if (status.destDataViewDeleted?.success) {
        toastNotificationService.displaySuccessToast(
          i18n.translate(
            'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithDataViewSuccessMessage',
            {
              defaultMessage: 'Request to delete data view {destinationIndex} acknowledged.',
              values: { destinationIndex },
            }
          )
        );
      }
      if (status.destDataViewDeleted?.error) {
        const error = extractErrorMessage(status.destDataViewDeleted.error);
        toastNotificationService.displayDangerToast(
          i18n.translate(
            'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithDataViewErrorMessage',
            {
              defaultMessage: 'An error occurred deleting data view {destinationIndex}: {error}',
              values: { destinationIndex, error },
            }
          )
        );
      }
    } catch (e) {
      toastNotificationService.displayErrorToast(
        e,
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
          defaultMessage: 'An error occurred deleting the data frame analytics job {analyticsId}',
          values: { analyticsId: analyticsConfig.id },
        })
      );
    }
    refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
  };
};

export const useCanDeleteIndex = () => {
  const toastNotificationService = useToastNotificationService();
  const ml = useMlApiContext();

  return async (indexName: string) => {
    try {
      const privilege = await ml.hasPrivileges({
        index: [
          {
            names: [indexName], // uses wildcard
            privileges: ['delete_index'],
          },
        ],
      });
      if (!privilege) {
        return false;
      }

      return (
        privilege.hasPrivileges === undefined || privilege.hasPrivileges.has_all_requested === true
      );
    } catch (e) {
      const error = extractErrorMessage(e);
      toastNotificationService.displayDangerToast(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsPrivilegeErrorMessage', {
          defaultMessage: 'User does not have permission to delete index {indexName}: {error}',
          values: { indexName, error },
        })
      );
    }
  };
};

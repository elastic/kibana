/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { ml } from '../../../../../services/ml_api_service';
import { ToastNotificationService } from '../../../../../services/toast_notification_service';
import { refreshAnalyticsList$, REFRESH_ANALYTICS_LIST_STATE } from '../../../../common';
import {
  isDataFrameAnalyticsFailed,
  DataFrameAnalyticsListRow,
} from '../../components/analytics_list/common';

export const deleteAnalytics = async (
  analyticsConfig: DataFrameAnalyticsListRow['config'],
  analyticsStats: DataFrameAnalyticsListRow['stats'],
  toastNotificationService: ToastNotificationService
) => {
  try {
    if (isDataFrameAnalyticsFailed(analyticsStats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(analyticsConfig.id, true);
    }
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

export const deleteAnalyticsAndDestIndex = async (
  analyticsConfig: DataFrameAnalyticsListRow['config'],
  analyticsStats: DataFrameAnalyticsListRow['stats'],
  deleteDestIndex: boolean,
  deleteDestIndexPattern: boolean,
  toastNotificationService: ToastNotificationService
) => {
  const destinationIndex = Array.isArray(analyticsConfig.dest.index)
    ? analyticsConfig.dest.index[0]
    : analyticsConfig.dest.index;
  try {
    if (isDataFrameAnalyticsFailed(analyticsStats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(analyticsConfig.id, true);
    }
    const status = await ml.dataFrameAnalytics.deleteDataFrameAnalyticsAndDestIndex(
      analyticsConfig.id,
      deleteDestIndex,
      deleteDestIndexPattern
    );
    if (status.analyticsJobDeleted?.success) {
      toastNotificationService.displaySuccessToast(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
          defaultMessage: 'Request to delete data frame analytics job {analyticsId} acknowledged.',
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
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexSuccessMessage', {
          defaultMessage: 'Request to delete destination index {destinationIndex} acknowledged.',
          values: { destinationIndex },
        })
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

    if (status.destIndexPatternDeleted?.success) {
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
    if (status.destIndexPatternDeleted?.error) {
      const error = extractErrorMessage(status.destIndexPatternDeleted.error);
      toastNotificationService.displayDangerToast(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithDataViewErrorMessage', {
          defaultMessage: 'An error occurred deleting data view {destinationIndex}: {error}',
          values: { destinationIndex, error },
        })
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

export const canDeleteIndex = async (
  indexName: string,
  toastNotificationService: ToastNotificationService
) => {
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
    return privilege.securityDisabled === true || privilege.has_all_requested === true;
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

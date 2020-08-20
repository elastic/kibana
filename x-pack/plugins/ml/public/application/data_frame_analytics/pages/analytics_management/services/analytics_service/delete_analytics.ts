/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  d: DataFrameAnalyticsListRow,
  toastNotificationService: ToastNotificationService
) => {
  try {
    if (isDataFrameAnalyticsFailed(d.stats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(d.config.id, true);
    }
    await ml.dataFrameAnalytics.deleteDataFrameAnalytics(d.config.id);
    toastNotificationService.displaySuccessToast(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
        defaultMessage: 'Request to delete data frame analytics job {analyticsId} acknowledged.',
        values: { analyticsId: d.config.id },
      })
    );
  } catch (e) {
    toastNotificationService.displayErrorToast(
      e,
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
        defaultMessage: 'An error occurred deleting the data frame analytics job {analyticsId}',
        values: { analyticsId: d.config.id },
      })
    );
  }
  refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
};

export const deleteAnalyticsAndDestIndex = async (
  d: DataFrameAnalyticsListRow,
  deleteDestIndex: boolean,
  deleteDestIndexPattern: boolean,
  toastNotificationService: ToastNotificationService
) => {
  const destinationIndex = Array.isArray(d.config.dest.index)
    ? d.config.dest.index[0]
    : d.config.dest.index;
  try {
    if (isDataFrameAnalyticsFailed(d.stats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(d.config.id, true);
    }
    const status = await ml.dataFrameAnalytics.deleteDataFrameAnalyticsAndDestIndex(
      d.config.id,
      deleteDestIndex,
      deleteDestIndexPattern
    );
    if (status.analyticsJobDeleted?.success) {
      toastNotificationService.displaySuccessToast(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
          defaultMessage: 'Request to delete data frame analytics job {analyticsId} acknowledged.',
          values: { analyticsId: d.config.id },
        })
      );
    }
    if (status.analyticsJobDeleted?.error) {
      toastNotificationService.displayErrorToast(
        status.analyticsJobDeleted.error,
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
          defaultMessage: 'An error occurred deleting the data frame analytics job {analyticsId}',
          values: { analyticsId: d.config.id },
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
      const error = extractErrorMessage(status.destIndexDeleted.error);
      toastNotificationService.displayDangerToast(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexErrorMessage', {
          defaultMessage:
            'An error occurred deleting destination index {destinationIndex}: {error}',
          values: { destinationIndex, error },
        })
      );
    }

    if (status.destIndexPatternDeleted?.success) {
      toastNotificationService.displaySuccessToast(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexPatternSuccessMessage',
          {
            defaultMessage: 'Request to delete index pattern {destinationIndex} acknowledged.',
            values: { destinationIndex },
          }
        )
      );
    }
    if (status.destIndexPatternDeleted?.error) {
      const error = extractErrorMessage(status.destIndexPatternDeleted.error);
      toastNotificationService.displayDangerToast(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexPatternErrorMessage',
          {
            defaultMessage: 'An error occurred deleting index pattern {destinationIndex}: {error}',
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
        values: { analyticsId: d.config.id },
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

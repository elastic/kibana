/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { getToastNotifications } from '../../../../../util/dependency_cache';
import { ml } from '../../../../../services/ml_api_service';
import { refreshAnalyticsList$, REFRESH_ANALYTICS_LIST_STATE } from '../../../../common';
import {
  isDataFrameAnalyticsFailed,
  DataFrameAnalyticsListRow,
} from '../../components/analytics_list/common';

export const deleteAnalytics = async (d: DataFrameAnalyticsListRow) => {
  const toastNotifications = getToastNotifications();
  try {
    if (isDataFrameAnalyticsFailed(d.stats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(d.config.id, true);
    }
    await ml.dataFrameAnalytics.deleteDataFrameAnalytics(d.config.id);
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
        defaultMessage: 'Request to delete data frame analytics job {analyticsId} acknowledged.',
        values: { analyticsId: d.config.id },
      })
    );
  } catch (e) {
    const error = extractErrorMessage(e);

    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
        defaultMessage:
          'An error occurred deleting the data frame analytics job {analyticsId}: {error}',
        values: { analyticsId: d.config.id, error },
      })
    );
  }
  refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
};

export const deleteAnalyticsAndDestIndex = async (
  d: DataFrameAnalyticsListRow,
  deleteDestIndex: boolean,
  deleteDestIndexPattern: boolean
) => {
  const toastNotifications = getToastNotifications();
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
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
          defaultMessage: 'Request to delete data frame analytics job {analyticsId} acknowledged.',
          values: { analyticsId: d.config.id },
        })
      );
    }
    if (status.analyticsJobDeleted?.error) {
      const error = extractErrorMessage(status.analyticsJobDeleted.error);
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
          defaultMessage:
            'An error occurred deleting the data frame analytics job {analyticsId}: {error}',
          values: { analyticsId: d.config.id, error },
        })
      );
    }

    if (status.destIndexDeleted?.success) {
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexSuccessMessage', {
          defaultMessage: 'Request to delete destination index {destinationIndex} acknowledged.',
          values: { destinationIndex },
        })
      );
    }
    if (status.destIndexDeleted?.error) {
      const error = extractErrorMessage(status.destIndexDeleted.error);
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexErrorMessage', {
          defaultMessage:
            'An error occurred deleting destination index {destinationIndex}: {error}',
          values: { destinationIndex, error },
        })
      );
    }

    if (status.destIndexPatternDeleted?.success) {
      toastNotifications.addSuccess(
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
      toastNotifications.addDanger(
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
    const error = extractErrorMessage(e);

    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
        defaultMessage:
          'An error occurred deleting the data frame analytics job {analyticsId}: {error}',
        values: { analyticsId: d.config.id, error },
      })
    );
  }
  refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
};

export const canDeleteIndex = async (indexName: string) => {
  const toastNotifications = getToastNotifications();
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
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsPrivilegeErrorMessage', {
        defaultMessage: 'User does not have permission to delete index {indexName}: {error}',
        values: { indexName, error },
      })
    );
  }
};

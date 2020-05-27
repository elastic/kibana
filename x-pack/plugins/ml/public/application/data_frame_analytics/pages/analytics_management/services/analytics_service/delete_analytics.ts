/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { getToastNotifications } from '../../../../../util/dependency_cache';
import { ml } from '../../../../../services/ml_api_service';
import { refreshAnalyticsList$, REFRESH_ANALYTICS_LIST_STATE } from '../../../../common';
import {
  isDataFrameAnalyticsFailed,
  DataFrameAnalyticsListRow,
} from '../../components/analytics_list/common';
import { extractErrorMessage } from '../../../../../util/error_utils';

export const deleteAnalytics = async (d: DataFrameAnalyticsListRow) => {
  const toastNotifications = getToastNotifications();
  try {
    if (isDataFrameAnalyticsFailed(d.stats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(d.config.id, true);
    }
    await ml.dataFrameAnalytics.deleteDataFrameAnalytics(d.config.id);
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
        defaultMessage: 'Request to delete data frame analytics {analyticsId} acknowledged.',
        values: { analyticsId: d.config.id },
      })
    );
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
        defaultMessage:
          'An error occurred deleting the data frame analytics {analyticsId}: {error}',
        values: { analyticsId: d.config.id, error: JSON.stringify(e) },
      })
    );
  }
  refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
};

export const deleteAnalyticsAndTargetIndex = async (
  d: DataFrameAnalyticsListRow,
  deleteTargetIndex: boolean,
  deleteTargetPattern: boolean
) => {
  const toastNotifications = getToastNotifications();
  const destinationIndex = d.config.dest.index;
  try {
    if (isDataFrameAnalyticsFailed(d.stats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(d.config.id, true);
    }
    const status = await ml.dataFrameAnalytics.deleteDataFrameAnalyticsAndTargetIndex(
      d.config.id,
      deleteTargetIndex,
      deleteTargetPattern
    );
    if (status.analyticsJobDeleted?.success) {
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
          defaultMessage: 'Request to delete data frame analytics {analyticsId} acknowledged.',
          values: { analyticsId: d.config.id },
        })
      );
    }
    if (status.analyticsJobDeleted?.error) {
      const error = extractErrorMessage(status.targetIndexDeleted.error);
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
          defaultMessage:
            'An error occurred deleting the data frame analytics {analyticsId}: {error}',
          values: { analyticsId: d.config.id, error },
        })
      );
    }

    if (status.targetIndexDeleted?.success) {
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexSuccessMessage', {
          defaultMessage: 'Request to delete destination index {destinationIndex} acknowledged.',
          values: { destinationIndex },
        })
      );
    }
    if (status.targetIndexDeleted?.error) {
      const error = extractErrorMessage(status.targetIndexDeleted.error);
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexErrorMessage', {
          defaultMessage:
            'An error occurred deleting destination index {destinationIndex}: {error}',
          values: { destinationIndex, error },
        })
      );
    }

    if (status.targetIndexPatternDeleted?.success) {
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
    if (status.targetIndexPatternDeleted?.error) {
      const error = extractErrorMessage(status.targetIndexPatternDeleted.error);
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.deleteAnalyticsWithIndexPatternSuccessMessage',
          {
            defaultMessage: 'An error occurred deleting index pattern {destinationIndex}: {error}',
            values: { destinationIndex, error },
          }
        )
      );
    }
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
        defaultMessage:
          'An error occurred deleting the data frame analytics {analyticsId}: {error}',
        values: { analyticsId: d.config.id, error: JSON.stringify(e) },
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
    return privilege.securityDisabled === true || privilege.has_all_requested === true;
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsPrivilegeErrorMessage', {
        defaultMessage: 'User does not have permission to delete index {indexName}: {error}',
        values: { indexName, error: JSON.stringify(e) },
      })
    );
  }
};

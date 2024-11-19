/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { useMlApi } from '../../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

import { refreshAnalyticsList$, REFRESH_ANALYTICS_LIST_STATE } from '../../../../common';

import type { DataFrameAnalyticsListRow } from '../../components/analytics_list/common';

export const useStartAnalytics = () => {
  const toastNotificationService = useToastNotificationService();
  const mlApi = useMlApi();

  return async (d: DataFrameAnalyticsListRow) => {
    try {
      await mlApi.dataFrameAnalytics.startDataFrameAnalytics(d.config.id);
      toastNotificationService.displaySuccessToast(
        i18n.translate('xpack.ml.dataframe.analyticsList.startAnalyticsSuccessMessage', {
          defaultMessage: 'Request to start data frame analytics {analyticsId} acknowledged.',
          values: { analyticsId: d.config.id },
        })
      );
    } catch (e) {
      toastNotificationService.displayErrorToast(
        e,
        i18n.translate('xpack.ml.dataframe.analyticsList.startAnalyticsErrorTitle', {
          defaultMessage: 'Error starting job',
        })
      );
    }
    refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
  };
};

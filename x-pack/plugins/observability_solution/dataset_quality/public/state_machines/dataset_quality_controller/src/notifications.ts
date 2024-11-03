/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export const fetchDatasetStatsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetStatsFailed', {
      defaultMessage: "We couldn't get your data sets.",
    }),
    text: error.message,
  });
};

export const fetchDegradedStatsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDegradedStatsFailed', {
      defaultMessage: "We couldn't get your degraded docs information.",
    }),
    text: error.message,
  });
};

export const fetchIntegrationsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchIntegrationsFailed', {
      defaultMessage: "We couldn't get your integrations.",
    }),
    text: error.message,
  });
};

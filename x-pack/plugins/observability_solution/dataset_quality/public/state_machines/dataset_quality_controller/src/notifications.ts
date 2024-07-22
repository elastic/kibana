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

export const fetchDatasetDetailsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetDetailsFailed', {
      defaultMessage: "We couldn't get your data set details.",
    }),
    text: error.message,
  });
};

export const fetchDatasetSettingsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetSettingsFailed', {
      defaultMessage: "Data set settings couldn't be loaded.",
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

export const fetchNonAggregatableDatasetsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchNonAggregatableDatasetsFailed', {
      defaultMessage: "We couldn't get non aggregatable datasets information.",
    }),
    text: error.message,
  });
};

export const fetchIntegrationDashboardsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchIntegrationDashboardsFailed', {
      defaultMessage: "We couldn't get your integration dashboards.",
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

export const fetchDataStreamIntegrationFailedNotifier = (
  toasts: IToasts,
  error: Error,
  integrationName?: string
) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.flyout.fetchIntegrationsFailed', {
      defaultMessage: "We couldn't get {integrationName} integration info.",
      values: {
        integrationName,
      },
    }),
    text: error.message,
  });
};

export const noDatasetSelected = i18n.translate(
  'xpack.datasetQuality.fetchDatasetDetailsFailed.noDatasetSelected',
  {
    defaultMessage: 'No data set have been selected',
  }
);

export const assertBreakdownFieldEcsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality. assertBreakdownFieldEcsFailed', {
      defaultMessage: "We couldn't retrieve breakdown field metadata.",
    }),
    text: error.message,
  });
};

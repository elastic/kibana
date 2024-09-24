/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';

export const fetchDataStreamDetailsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.details.fetchDataStreamDetailsFailed', {
      defaultMessage: "We couldn't get your datastream details.",
    }),
    text: error.message,
  });
};

export const assertBreakdownFieldEcsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.details.checkBreakdownFieldEcsFailed', {
      defaultMessage: "We couldn't retrieve breakdown field metadata.",
    }),
    text: error.message,
  });
};

export const fetchDataStreamSettingsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.details.fetchDataStreamSettingsFailed', {
      defaultMessage: "Data stream settings couldn't be loaded.",
    }),
    text: error.message,
  });
};

export const fetchIntegrationDashboardsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.details.fetchIntegrationDashboardsFailed', {
      defaultMessage: "We couldn't get your integration dashboards.",
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
    title: i18n.translate('xpack.datasetQuality.details.fetchIntegrationsFailed', {
      defaultMessage: "We couldn't get {integrationName} integration info.",
      values: {
        integrationName,
      },
    }),
    text: error.message,
  });
};

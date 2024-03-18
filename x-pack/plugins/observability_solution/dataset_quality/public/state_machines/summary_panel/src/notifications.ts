/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

export const fetchDatasetsQualityFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetsQualityDetailsFailed', {
      defaultMessage: "We couldn't get your datasets quality details. Default values are shown.",
    }),
    text: error.message,
  });
};

export const fetchDatasetsActivityFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetsActivityFailed', {
      defaultMessage:
        "We couldn't get your active/inactive datasets details. Default values are shown.",
    }),
    text: error.message,
  });
};

export const fetchDatasetsEstimatedDataFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchDatasetsEstimatedDataFailed', {
      defaultMessage: "We couldn't get your datasets estimated data. Default values are shown.",
    }),
    text: error.message,
  });
};

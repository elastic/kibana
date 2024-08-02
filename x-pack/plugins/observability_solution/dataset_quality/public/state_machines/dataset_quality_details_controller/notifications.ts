/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
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

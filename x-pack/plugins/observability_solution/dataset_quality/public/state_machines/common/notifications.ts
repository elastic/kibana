/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';

export const fetchNonAggregatableDatasetsFailedNotifier = (toasts: IToasts, error: Error) => {
  toasts.addDanger({
    title: i18n.translate('xpack.datasetQuality.fetchNonAggregatableDatasetsFailed', {
      defaultMessage: "We couldn't get non aggregatable datasets information.",
    }),
    text: error.message,
  });
};

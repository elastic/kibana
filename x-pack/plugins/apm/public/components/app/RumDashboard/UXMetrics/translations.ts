/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FCP_LABEL = i18n.translate('xpack.apm.rum.coreVitals.fcp', {
  defaultMessage: 'First contentful paint',
});

export const TBT_LABEL = i18n.translate('xpack.apm.rum.coreVitals.tbt', {
  defaultMessage: 'Total blocking time',
});

export const NO_OF_LONG_TASK = i18n.translate(
  'xpack.apm.rum.uxMetrics.noOfLongTasks',
  {
    defaultMessage: 'No. of long tasks',
  }
);

export const LONGEST_LONG_TASK = i18n.translate(
  'xpack.apm.rum.uxMetrics.longestLongTasks',
  {
    defaultMessage: 'Longest long task duration',
  }
);

export const SUM_LONG_TASKS = i18n.translate(
  'xpack.apm.rum.uxMetrics.sumLongTasks',
  {
    defaultMessage: 'Total long tasks duration',
  }
);

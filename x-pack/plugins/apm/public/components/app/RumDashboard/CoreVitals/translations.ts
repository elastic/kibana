/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const LCP_LABEL = i18n.translate('xpack.apm.rum.coreVitals.lcp', {
  defaultMessage: 'Largest contentful paint',
});

export const FID_LABEL = i18n.translate('xpack.apm.rum.coreVitals.fip', {
  defaultMessage: 'First input delay',
});

export const CLS_LABEL = i18n.translate('xpack.apm.rum.coreVitals.cls', {
  defaultMessage: 'Cumulative layout shift',
});

export const FCP_LABEL = i18n.translate('xpack.apm.rum.coreVitals.fcp', {
  defaultMessage: 'First contentful paint',
});

export const TBT_LABEL = i18n.translate('xpack.apm.rum.coreVitals.tbt', {
  defaultMessage: 'Total blocking time',
});

export const NO_OF_LONG_TASK = i18n.translate(
  'xpack.apm.rum.uxMetrics.noOfLongTasks',
  {
    defaultMessage: 'No of long task',
  }
);

export const LONGEST_LONG_TASK = i18n.translate(
  'xpack.apm.rum.uxMetrics.longestLongTasks',
  {
    defaultMessage: 'Longest long task',
  }
);

export const SUM_LONG_TASKS = i18n.translate(
  'xpack.apm.rum.uxMetrics.sumLongTasks',
  {
    defaultMessage: 'Sum of long tasks',
  }
);

export const POOR_LABEL = i18n.translate('xpack.apm.rum.coreVitals.poor', {
  defaultMessage: 'a poor',
});

export const GOOD_LABEL = i18n.translate('xpack.apm.rum.coreVitals.good', {
  defaultMessage: 'a good',
});

export const AVERAGE_LABEL = i18n.translate(
  'xpack.apm.rum.coreVitals.average',
  {
    defaultMessage: 'an average',
  }
);

export const MORE_LABEL = i18n.translate('xpack.apm.rum.coreVitals.more', {
  defaultMessage: 'more',
});

export const LESS_LABEL = i18n.translate('xpack.apm.rum.coreVitals.less', {
  defaultMessage: 'less',
});

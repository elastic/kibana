/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_DATA = i18n.translate('xpack.observability.ux.coreVitals.noData', {
  defaultMessage: 'No data is available.',
});

export const LCP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.lcp', {
  defaultMessage: 'Largest contentful paint',
});

export const FID_LABEL = i18n.translate('xpack.observability.ux.coreVitals.fip', {
  defaultMessage: 'First input delay',
});

export const CLS_LABEL = i18n.translate('xpack.observability.ux.coreVitals.cls', {
  defaultMessage: 'Cumulative layout shift',
});

export const CV_POOR_LABEL = i18n.translate('xpack.observability.ux.coreVitals.poor', {
  defaultMessage: 'a poor',
});

export const CV_GOOD_LABEL = i18n.translate('xpack.observability.ux.coreVitals.good', {
  defaultMessage: 'a good',
});

export const CV_AVERAGE_LABEL = i18n.translate('xpack.observability.ux.coreVitals.average', {
  defaultMessage: 'an average',
});

export const LEGEND_POOR_LABEL = i18n.translate('xpack.observability.ux.coreVitals.legends.poor', {
  defaultMessage: 'Poor',
});

export const LEGEND_GOOD_LABEL = i18n.translate('xpack.observability.ux.coreVitals.legends.good', {
  defaultMessage: 'Good',
});

export const LEGEND_NEEDS_IMPROVEMENT_LABEL = i18n.translate(
  'xpack.observability.ux.coreVitals.legends.needsImprovement',
  {
    defaultMessage: 'Needs improvement',
  }
);

export const MORE_LABEL = i18n.translate('xpack.observability.ux.coreVitals.more', {
  defaultMessage: 'more',
});

export const LESS_LABEL = i18n.translate('xpack.observability.ux.coreVitals.less', {
  defaultMessage: 'less',
});

export const IS_LABEL = i18n.translate('xpack.observability.ux.coreVitals.is', {
  defaultMessage: 'is',
});

export const TAKES_LABEL = i18n.translate('xpack.observability.ux.coreVitals.takes', {
  defaultMessage: 'takes',
});

export const LCP_HELP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.lcp.help', {
  defaultMessage:
    'Largest contentful paint measures loading performance. To provide a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading.',
});

export const FID_HELP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.fid.help', {
  defaultMessage:
    'First input delay measures interactivity. To provide a good user experience, pages should have a FID of less than 100 milliseconds.',
});

export const CLS_HELP_LABEL = i18n.translate('xpack.observability.ux.coreVitals.cls.help', {
  defaultMessage:
    'Cumulative Layout Shift (CLS): measures visual stability. To provide a good user experience, pages should maintain a CLS of less than 0.1.',
});

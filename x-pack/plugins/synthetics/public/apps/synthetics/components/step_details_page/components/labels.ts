/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LCP_HELP_LABEL = i18n.translate('xpack.synthetics.coreVitals.lcp.help', {
  defaultMessage:
    'Largest contentful paint measures loading performance. To provide a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading.',
});

export const CLS_HELP_LABEL = i18n.translate('xpack.synthetics.coreVitals.cls.help', {
  defaultMessage:
    'Cumulative Layout Shift (CLS): measures visual stability. To provide a good user experience, pages should maintain a CLS of less than 0.1.',
});

export const FCP_TOOLTIP = i18n.translate('xpack.synthetics.coreVitals.fcpTooltip', {
  defaultMessage:
    'First contentful paint (FCP) focuses on the initial rendering and measures the time from when the page starts loading to when any part of the page’s content is displayed on the screen.',
});

export const DCL_TOOLTIP = i18n.translate('xpack.synthetics.coreVitals.dclTooltip', {
  defaultMessage:
    'Triggered when the browser completes parsing the document. Helpful when there are multiple listeners, or logic is executed: domContentLoadedEventEnd - domContentLoadedEventStart.',
});

export const LCP_LABEL = i18n.translate('xpack.synthetics.fieldLabels.lcp', {
  defaultMessage: 'Largest contentful paint (LCP)',
});

export const FCP_LABEL = i18n.translate('xpack.synthetics.fieldLabels.fcp', {
  defaultMessage: 'First contentful paint (FCP)',
});

export const CLS_LABEL = i18n.translate('xpack.synthetics.fieldLabels.cls', {
  defaultMessage: 'Cumulative layout shift (CLS)',
});

export const DCL_LABEL = i18n.translate('xpack.synthetics.fieldLabels.dcl', {
  defaultMessage: 'DOMContentLoaded event (DCL)',
});

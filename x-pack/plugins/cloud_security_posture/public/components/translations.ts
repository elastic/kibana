/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const CRITICAL = i18n.translate('xpack.csp.critical', {
  defaultMessage: 'Critical',
});

export const WARNING = i18n.translate('xpack.csp.warning', {
  defaultMessage: 'Warning',
});

export const HEALTHY = i18n.translate('xpack.csp.healthy', {
  defaultMessage: 'Healthy',
});

export const PAGE_NOT_FOUND = i18n.translate('xpack.csp.page_not_found', {
  defaultMessage: 'Page not found',
});

export const LOADING = i18n.translate('xpack.csp.loading', {
  defaultMessage: 'Loading...',
});

export const CSP_EVALUATION_BADGE_FAILED = i18n.translate(
  'xpack.csp.cspEvaluationBadge.failedLabelText',
  {
    defaultMessage: 'FAILED',
  }
);

export const CSP_EVALUATION_BADGE_PASSED = i18n.translate(
  'xpack.csp.cspEvaluationBadge.passedLabelText',
  {
    defaultMessage: 'PASSED',
  }
);

export const NO_DATA_CONFIG_TITLE = i18n.translate('xpack.csp.pageTemplate.noDataConfigTitle', {
  defaultMessage: 'Understand your cloud security posture',
});

export const NO_DATA_CONFIG_SOLUTION_NAME = i18n.translate(
  'xpack.csp.pageTemplate.noDataConfig.solutionNameLabel',
  {
    defaultMessage: 'Cloud Security Posture',
  }
);

export const NO_DATA_CONFIG_DESCRIPTION = i18n.translate(
  'xpack.csp.pageTemplate.noDataConfigDescription',
  {
    defaultMessage:
      'Use our CIS Kubernetes Benchmark integration to measure your Kubernetes cluster setup against the CIS recommendations.',
  }
);

export const NO_DATA_CONFIG_BUTTON = i18n.translate(
  'xpack.csp.pageTemplate.noDataConfigButtonLabel',
  {
    defaultMessage: 'Add a CIS integration',
  }
);

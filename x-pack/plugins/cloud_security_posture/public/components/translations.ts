/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const PACKAGE_NOT_INSTALLED_TEXT = {
  PAGE_TITLE: i18n.translate('xpack.csp.cspPageTemplate.packageNotInstalled.pageTitle', {
    defaultMessage: 'Install Integration to get started',
  }),
  SOLUTION: i18n.translate('xpack.csp.cspPageTemplate.packageNotInstalled.solutionNameLabel', {
    defaultMessage: 'Cloud Security Posture',
  }),
  BUTTON_TITLE: i18n.translate('xpack.csp.cspPageTemplate.packageNotInstalled.buttonLabel', {
    defaultMessage: 'Add a CIS integration',
  }),
  DESCRIPTION: i18n.translate('xpack.csp.cspPageTemplate.packageNotInstalled.description', {
    defaultMessage:
      'Use our CIS Kubernetes Benchmark integration to measure your Kubernetes cluster setup against the CIS recommendations.',
  }),
};

export const DEFAULT_NO_DATA_TEXT = {
  PAGE_TITLE: i18n.translate('xpack.csp.cspPageTemplate.defaultNoDataConfig.pageTitle', {
    defaultMessage: 'No data found',
  }),
  SOLUTION: i18n.translate('xpack.csp.cspPageTemplate.defaultNoDataConfig.solutionNameLabel', {
    defaultMessage: 'Cloud Security Posture',
  }),
};

export const CLOUD_SECURITY_POSTURE = i18n.translate('xpack.csp.cspPageTemplate.navigationTitle', {
  defaultMessage: 'Cloud Security Posture',
});

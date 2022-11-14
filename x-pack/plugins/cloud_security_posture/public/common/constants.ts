/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { CLOUDBEAT_EKS, CLOUDBEAT_VANILLA } from '../../common/constants';

export const statusColors = {
  passed: euiThemeVars.euiColorVis0,
  failed: euiThemeVars.euiColorVis9,
};

export const CSP_MOMENT_FORMAT = 'MMMM D, YYYY @ HH:mm:ss.SSS';

export type CloudPostureIntegrations = typeof cloudPostureIntegrations;

export const cloudPostureIntegrations = {
  kspm: {
    policyTemplate: 'kspm',
    name: i18n.translate('xpack.csp.kspmIntegration.integration.nameTitle', {
      defaultMessage: 'Kubernetes Security Posture Management',
    }),
    shortName: i18n.translate('xpack.csp.kspmIntegration.integration.shortNameTitle', {
      defaultMessage: 'KSPM',
    }),
    options: [
      {
        type: CLOUDBEAT_VANILLA,
        name: i18n.translate('xpack.csp.kspmIntegration.vanillaOption.nameTitle', {
          defaultMessage: 'Unmanaged Kubernetes',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.vanillaOption.benchmarkTitle', {
          defaultMessage: 'CIS Kubernetes',
        }),
      },
      {
        type: CLOUDBEAT_EKS,
        name: i18n.translate('xpack.csp.kspmIntegration.eksOption.nameTitle', {
          defaultMessage: 'EKS (Elastic Kubernetes Service)',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.eksOption.benchmarkTitle', {
          defaultMessage: 'CIS EKS',
        }),
      },
    ],
  },
} as const;

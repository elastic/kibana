/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_AWS,
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_INTEGRATION,
  POLICY_TEMPLATE,
} from '../../common/constants';

export const statusColors = {
  passed: euiThemeVars.euiColorVis0,
  failed: euiThemeVars.euiColorVis9,
};

export const CSP_MOMENT_FORMAT = 'MMMM D, YYYY @ HH:mm:ss.SSS';
export const MAX_FINDINGS_TO_LOAD = 500;
export const DEFAULT_VISIBLE_ROWS_PER_PAGE = 25;

export const LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY = 'cloudPosture:findings:pageSize';
export const LOCAL_STORAGE_PAGE_SIZE_BENCHMARK_KEY = 'cloudPosture:benchmark:pageSize';
export const LOCAL_STORAGE_PAGE_SIZE_RULES_KEY = 'cloudPosture:rules:pageSize';

export type CloudPostureIntegrations = Record<POLICY_TEMPLATE, CloudPostureIntegrationProps>;
export interface CloudPostureIntegrationProps {
  policyTemplate: POLICY_TEMPLATE;
  name: string;
  shortName: string;
  options: Array<{
    type: CLOUDBEAT_INTEGRATION;
    name: string;
    benchmark: string;
  }>;
}

export const cloudPostureIntegrations: CloudPostureIntegrations = {
  cspm: {
    policyTemplate: 'cspm',
    name: i18n.translate('xpack.csp.cspmIntegration.integration.nameTitle', {
      defaultMessage: 'Cloud Security Posture Management',
    }),
    shortName: i18n.translate('xpack.csp.cspmIntegration.integration.shortNameTitle', {
      defaultMessage: 'CSPM',
    }),
    options: [
      {
        type: CLOUDBEAT_AWS,
        name: i18n.translate('xpack.csp.cspmIntegration.awsOption.nameTitle', {
          defaultMessage: 'Amazon Web Services',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.awsOption.benchmarkTitle', {
          defaultMessage: 'CIS AWS',
        }),
      },
      {
        type: CLOUDBEAT_GCP,
        name: i18n.translate('xpack.csp.cspmIntegration.gcpOption.nameTitle', {
          defaultMessage: 'GCP',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.gcpOption.benchmarkTitle', {
          defaultMessage: 'CIS GCP',
        }),
      },
      {
        type: CLOUDBEAT_AZURE,
        name: i18n.translate('xpack.csp.cspmIntegration.azureOption.nameTitle', {
          defaultMessage: 'Azure',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.azureOption.benchmarkTitle', {
          defaultMessage: 'CIS Azure',
        }),
      },
    ],
  },
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
          defaultMessage: 'Self-Managed/Vanilla Kubernetes',
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
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { CloudSecurityPolicyTemplate, PostureInput } from '../../common/types_old';
import {
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_AWS,
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_VULN_MGMT_AWS,
  KSPM_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
  VULN_MGMT_POLICY_TEMPLATE,
  CLOUDBEAT_VULN_MGMT_GCP,
  CLOUDBEAT_VULN_MGMT_AZURE,
  CLOUDBEAT_AKS,
  CLOUDBEAT_GKE,
} from '../../common/constants';

import eksLogo from '../assets/icons/cis_eks_logo.svg';
import aksLogo from '../assets/icons/cis_aks_logo.svg';
import gkeLogo from '../assets/icons/cis_gke_logo.svg';
import googleCloudLogo from '../assets/icons/google_cloud_logo.svg';

export const statusColors = {
  passed: euiThemeVars.euiColorSuccess,
  failed: euiThemeVars.euiColorVis9,
};

export const CSP_MOMENT_FORMAT = 'MMMM D, YYYY @ HH:mm:ss.SSS';
export const MAX_FINDINGS_TO_LOAD = 500;
export const DEFAULT_VISIBLE_ROWS_PER_PAGE = 25;

export const LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY = 'cloudPosture:dataTable:pageSize';
export const LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY = 'cloudPosture:dataTable:columns';
export const LOCAL_STORAGE_PAGE_SIZE_FINDINGS_KEY = 'cloudPosture:findings:pageSize';
export const LOCAL_STORAGE_PAGE_SIZE_BENCHMARK_KEY = 'cloudPosture:benchmark:pageSize';
export const LOCAL_STORAGE_PAGE_SIZE_RULES_KEY = 'cloudPosture:rules:pageSize';
export const LOCAL_STORAGE_DASHBOARD_CLUSTER_SORT_KEY =
  'cloudPosture:complianceDashboard:clusterSort';
export const LOCAL_STORAGE_DASHBOARD_BENCHMARK_SORT_KEY =
  'cloudPosture:complianceDashboard:benchmarkSort';
export const LOCAL_STORAGE_FINDINGS_LAST_SELECTED_TAB_KEY = 'cloudPosture:findings:lastSelectedTab';

export const LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY = 'cspLatestVulnerabilitiesGrouping';
export const LOCAL_STORAGE_FINDINGS_GROUPING_KEY = 'cspLatestFindingsGrouping';

export const SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED = 'cloudPosture:fieldsModal:showSelected';

export type CloudPostureIntegrations = Record<
  CloudSecurityPolicyTemplate,
  CloudPostureIntegrationProps
>;
export interface CloudPostureIntegrationProps {
  policyTemplate: CloudSecurityPolicyTemplate;
  name: string;
  shortName: string;
  options: Array<{
    type: PostureInput | typeof CLOUDBEAT_AKS | typeof CLOUDBEAT_GKE;
    name: string;
    benchmark: string;
    disabled?: boolean;
    icon?: string;
    tooltip?: string;
    isBeta?: boolean;
    testId?: string;
  }>;
}

export const cloudPostureIntegrations: CloudPostureIntegrations = {
  cspm: {
    policyTemplate: CSPM_POLICY_TEMPLATE,
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
          defaultMessage: 'AWS',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.awsOption.benchmarkTitle', {
          defaultMessage: 'CIS AWS',
        }),
        icon: 'logoAWS',
        testId: 'cisAwsTestId',
      },
      {
        type: CLOUDBEAT_GCP,
        name: i18n.translate('xpack.csp.cspmIntegration.gcpOption.nameTitle', {
          defaultMessage: 'GCP',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.gcpOption.benchmarkTitle', {
          defaultMessage: 'CIS GCP',
        }),
        icon: googleCloudLogo,
        testId: 'cisGcpTestId',
      },
      {
        type: CLOUDBEAT_AZURE,
        name: i18n.translate('xpack.csp.cspmIntegration.azureOption.nameTitle', {
          defaultMessage: 'Azure',
        }),
        benchmark: i18n.translate('xpack.csp.cspmIntegration.azureOption.benchmarkTitle', {
          defaultMessage: 'CIS Azure',
        }),
        icon: 'logoAzure',
        testId: 'cisAzureTestId',
      },
    ],
  },
  kspm: {
    policyTemplate: KSPM_POLICY_TEMPLATE,
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
          defaultMessage: 'Self-Managed',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.vanillaOption.benchmarkTitle', {
          defaultMessage: 'CIS Kubernetes',
        }),
        icon: 'logoKubernetes',
      },
      {
        type: CLOUDBEAT_EKS,
        name: i18n.translate('xpack.csp.kspmIntegration.eksOption.nameTitle', {
          defaultMessage: 'EKS',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.eksOption.benchmarkTitle', {
          defaultMessage: 'CIS EKS',
        }),
        icon: eksLogo,
        tooltip: i18n.translate('xpack.csp.kspmIntegration.eksOption.tooltipContent', {
          defaultMessage: 'Elastic Kubernetes Service',
        }),
      },
      {
        type: CLOUDBEAT_AKS,
        name: i18n.translate('xpack.csp.kspmIntegration.aksOption.nameTitle', {
          defaultMessage: 'AKS',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.aksOption.benchmarkTitle', {
          defaultMessage: 'CIS AKS',
        }),
        disabled: true,
        icon: aksLogo,
        tooltip: i18n.translate('xpack.csp.kspmIntegration.aksOption.tooltipContent', {
          defaultMessage: 'Azure Kubernetes Service - Coming soon',
        }),
      },
      {
        type: CLOUDBEAT_GKE,
        name: i18n.translate('xpack.csp.kspmIntegration.gkeOption.nameTitle', {
          defaultMessage: 'GKE',
        }),
        benchmark: i18n.translate('xpack.csp.kspmIntegration.gkeOption.benchmarkTitle', {
          defaultMessage: 'CIS GKE',
        }),
        disabled: true,
        icon: gkeLogo,
        tooltip: i18n.translate('xpack.csp.kspmIntegration.gkeOption.tooltipContent', {
          defaultMessage: 'Google Kubernetes Engine - Coming soon',
        }),
      },
    ],
  },
  vuln_mgmt: {
    policyTemplate: VULN_MGMT_POLICY_TEMPLATE,
    name: 'Vulnerability Management', // TODO: we should use i18n and fix this
    shortName: 'VULN_MGMT', // TODO: we should use i18n and fix this
    options: [
      {
        type: CLOUDBEAT_VULN_MGMT_AWS,
        name: i18n.translate('xpack.csp.vulnMgmtIntegration.awsOption.nameTitle', {
          defaultMessage: 'Amazon Web Services',
        }),
        icon: 'logoAWS',
        benchmark: 'N/A', // TODO: change benchmark to be optional
      },
      {
        type: CLOUDBEAT_VULN_MGMT_GCP,
        name: i18n.translate('xpack.csp.vulnMgmtIntegration.gcpOption.nameTitle', {
          defaultMessage: 'GCP',
        }),
        disabled: true,
        icon: googleCloudLogo,
        tooltip: i18n.translate('xpack.csp.vulnMgmtIntegration.gcpOption.tooltipContent', {
          defaultMessage: 'Coming soon',
        }),
        benchmark: 'N/A', // TODO: change benchmark to be optional
      },
      {
        type: CLOUDBEAT_VULN_MGMT_AZURE,
        name: i18n.translate('xpack.csp.vulnMgmtIntegration.azureOption.nameTitle', {
          defaultMessage: 'Azure',
        }),
        disabled: true,
        icon: 'logoAzure',
        tooltip: i18n.translate('xpack.csp.vulnMgmtIntegration.azureOption.tooltipContent', {
          defaultMessage: 'Coming soon',
        }),
        benchmark: 'N/A', // TODO: change benchmark to be optional
      },
    ],
  },
};
export const FINDINGS_DOCS_URL = 'https://ela.st/findings';
export const MIN_VERSION_GCP_CIS = '1.5.2';

export const NO_FINDINGS_STATUS_REFRESH_INTERVAL_MS = 10000;

export const DETECTION_ENGINE_RULES_KEY = 'detection_engine_rules';
export const DETECTION_ENGINE_ALERTS_KEY = 'detection_engine_alerts';

export const DEFAULT_GROUPING_TABLE_HEIGHT = 512;

export const FINDINGS_GROUPING_OPTIONS = {
  RESOURCE_NAME: 'resource.name',
  RULE_NAME: 'rule.name',
  CLOUD_ACCOUNT_NAME: 'cloud.account.name',
  ORCHESTRATOR_CLUSTER_NAME: 'orchestrator.cluster.name',
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KSPM_POLICY_TEMPLATE, CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import {
  AwsCredentialsTypeFieldMap,
  GcpCredentialsTypeFieldMap,
  PostureTypes,
  VulnSeverity,
} from './types_old';

export const CLOUD_SECURITY_INTERTAL_PREFIX_ROUTE_PATH = '/internal/cloud_security_posture/';

export const STATS_ROUTE_PATH = '/internal/cloud_security_posture/stats/{policy_template}';

export const VULNERABILITIES_DASHBOARD_ROUTE_PATH =
  '/internal/cloud_security_posture/vulnerabilities_dashboard';

export const BENCHMARKS_ROUTE_PATH = '/internal/cloud_security_posture/benchmarks';
export const BENCHMARKS_API_CURRENT_VERSION = '1';

export const FIND_CSP_BENCHMARK_RULE_ROUTE_PATH = '/internal/cloud_security_posture/rules/_find';
export const FIND_CSP_BENCHMARK_RULE_API_CURRENT_VERSION = '1';

export const CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH =
  '/internal/cloud_security_posture/rules/_bulk_action';
export const CSP_BENCHMARK_RULES_BULK_ACTION_API_CURRENT_VERSION = '1';

export const GET_DETECTION_RULE_ALERTS_STATUS_PATH =
  '/internal/cloud_security_posture/detection_engine_rules/alerts/_status';
export const DETECTION_RULE_ALERTS_STATUS_API_CURRENT_VERSION = '1';
export const DETECTION_RULE_RULES_API_CURRENT_VERSION = '2023-10-31';

export const CLOUD_SECURITY_POSTURE_PACKAGE_NAME = 'cloud_security_posture';

export const CDR_MISCONFIGURATIONS_DATA_VIEW_NAME = 'Latest Cloud Security Misconfigurations';
export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX =
  'security_solution_cdr_latest_misconfigurations';

export const FINDINGS_INDEX_NAME = 'logs-cloud_security_posture.findings';
export const FINDINGS_INDEX_PATTERN = 'logs-cloud_security_posture.findings-default*';
export const FINDINGS_INDEX_DEFAULT_NS = 'logs-cloud_security_posture.findings-default';

export const LATEST_FINDINGS_INDEX_TEMPLATE_NAME = 'logs-cloud_security_posture.findings_latest';
export const LATEST_FINDINGS_INDEX_DEFAULT_NS =
  'logs-cloud_security_posture.findings_latest-default';

export const BENCHMARK_SCORE_INDEX_TEMPLATE_NAME = 'logs-cloud_security_posture.scores';
export const BENCHMARK_SCORE_INDEX_PATTERN = 'logs-cloud_security_posture.scores-*';
export const BENCHMARK_SCORE_INDEX_DEFAULT_NS = 'logs-cloud_security_posture.scores-default';

export const CDR_VULNERABILITIES_DATA_VIEW_NAME = 'Latest Cloud Security Vulnerabilities';
export const CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX =
  'security_solution_cdr_latest_vulnerabilities';

export const VULNERABILITIES_INDEX_NAME = 'logs-cloud_security_posture.vulnerabilities';
export const VULNERABILITIES_INDEX_PATTERN = 'logs-cloud_security_posture.vulnerabilities-default*';
export const VULNERABILITIES_INDEX_DEFAULT_NS =
  'logs-cloud_security_posture.vulnerabilities-default';

export const LATEST_VULNERABILITIES_INDEX_TEMPLATE_NAME =
  'logs-cloud_security_posture.vulnerabilities_latest';

export const CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN =
  'logs-cloud_security_posture.vulnerabilities_latest-default';
export const CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN =
  'security_solution-*.vulnerability_latest';
export const CDR_VULNERABILITIES_INDEX_PATTERN = `${CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN},${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN}`;

export const LATEST_VULNERABILITIES_RETENTION_POLICY = '3d';

export const SECURITY_DEFAULT_DATA_VIEW_ID = 'security-solution-default';

export const ALERTS_INDEX_PATTERN = '.alerts-security.alerts-*';

export const CSP_INGEST_TIMESTAMP_PIPELINE = 'cloud_security_posture_add_ingest_timestamp_pipeline';
export const CSP_LATEST_FINDINGS_INGEST_TIMESTAMP_PIPELINE =
  'cloud_security_posture_latest_index_add_ingest_timestamp_pipeline';
export const CSP_LATEST_VULNERABILITIES_INGEST_TIMESTAMP_PIPELINE =
  'cloud_security_posture_latest_vulnerabilities_index_add_ingest_timestamp_pipeline';

export const RULE_PASSED = `passed`;
export const RULE_FAILED = `failed`;

export const POSTURE_TYPE_ALL = 'all';

export const CSPM_FINDINGS_STATS_INTERVAL = 5;

// A mapping of in-development features to their status. These features should be hidden from users but can be easily
// activated via a simple code change in a single location.
export const INTERNAL_FEATURE_FLAGS = {
  showManageRulesMock: false,
  showFindingFlyoutEvidence: true,
} as const;

export const CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE = 'csp-rule-template';
export const INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE = 'cloud-security-posture-settings';
export const INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID = 'csp-internal-settings';

export const CLOUDBEAT_VANILLA = 'cloudbeat/cis_k8s';
export const CLOUDBEAT_EKS = 'cloudbeat/cis_eks';
export const CLOUDBEAT_AKS = 'cloudbeat/cis_aks';
export const CLOUDBEAT_GKE = 'cloudbeat/cis_gke';
export const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';
export const CLOUDBEAT_GCP = 'cloudbeat/cis_gcp';
export const CLOUDBEAT_AZURE = 'cloudbeat/cis_azure';
export const CLOUDBEAT_VULN_MGMT_AWS = 'cloudbeat/vuln_mgmt_aws';
export const CLOUDBEAT_VULN_MGMT_GCP = 'cloudbeat/vuln_mgmt_gcp';
export const CLOUDBEAT_VULN_MGMT_AZURE = 'cloudbeat/vuln_mgmt_azure';
export const CIS_AWS = 'cis_aws';
export const CIS_GCP = 'cis_gcp';
export const CIS_K8S = 'cis_k8s';
export const CIS_EKS = 'cis_eks';
export const CIS_AZURE = 'cis_azure';
export const VULN_MGMT_POLICY_TEMPLATE = 'vuln_mgmt';
export const CNVM_POLICY_TEMPLATE = 'cnvm';
export const SUPPORTED_POLICY_TEMPLATES = [
  KSPM_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
  VULN_MGMT_POLICY_TEMPLATE,
] as const;
export const SUPPORTED_CLOUDBEAT_INPUTS = [
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_EKS,
  CLOUDBEAT_AWS,
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_VULN_MGMT_AWS,
  CLOUDBEAT_VULN_MGMT_GCP,
  CLOUDBEAT_VULN_MGMT_AZURE,
] as const;

export const POSTURE_TYPES: { [x: string]: PostureTypes } = {
  [KSPM_POLICY_TEMPLATE]: KSPM_POLICY_TEMPLATE,
  [CSPM_POLICY_TEMPLATE]: CSPM_POLICY_TEMPLATE,
  [VULN_MGMT_POLICY_TEMPLATE]: VULN_MGMT_POLICY_TEMPLATE,
  [POSTURE_TYPE_ALL]: POSTURE_TYPE_ALL,
};

export const VULNERABILITIES_SEVERITY: Record<VulnSeverity, VulnSeverity> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  UNKNOWN: 'UNKNOWN',
};

export const AWS_CREDENTIALS_TYPE_TO_FIELDS_MAP: AwsCredentialsTypeFieldMap = {
  assume_role: ['role_arn'],
  direct_access_keys: ['access_key_id', 'secret_access_key'],
  temporary_keys: ['access_key_id', 'secret_access_key', 'session_token'],
  shared_credentials: ['shared_credential_file', 'credential_profile_name'],
  cloud_formation: [],
};

export const DETECTION_ENGINE_ALERTS_INDEX_DEFAULT = '.alerts-security.alerts-default';

export const GCP_CREDENTIALS_TYPE_TO_FIELDS_MAP: GcpCredentialsTypeFieldMap = {
  'credentials-none': [],
  'credentials-file': ['gcp.credentials.file'],
  'credentials-json': ['gcp.credentials.json'],
};

export const AZURE_CREDENTIALS_TYPE_TO_FIELDS_MAP = {
  arm_template: [],
  service_principal_with_client_secret: [
    'azure.credentials.tenant_id',
    'azure.credentials.client_id',
    'azure.credentials.client_secret',
  ],
  service_principal_with_client_certificate: [
    'azure.credentials.tenant_id',
    'azure.credentials.client_id',
    'azure.credentials.client_certificate_path',
    'azure.credentials.client_certificate_password',
  ],
  service_principal_with_client_username_and_password: [
    'azure.credentials.tenant_id',
    'azure.credentials.client_id',
    'azure.credentials.client_username',
    'azure.credentials.client_password',
  ],
  managed_identity: [],
  manual: [],
};

export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';

export const ORGANIZATION_ACCOUNT = 'organization-account';
export const SINGLE_ACCOUNT = 'single-account';

export const CLOUD_SECURITY_PLUGIN_VERSION = '1.9.0';
// Cloud Credentials Template url was implemented in 1.10.0-preview01. See PR - https://github.com/elastic/integrations/pull/9828
export const CLOUD_CREDENTIALS_PACKAGE_VERSION = '1.10.0-preview01';

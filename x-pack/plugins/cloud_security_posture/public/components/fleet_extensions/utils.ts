/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicyConfigRecordEntry,
  RegistryPolicyTemplate,
  RegistryVarsEntry,
} from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import merge from 'lodash/merge';
import semverValid from 'semver/functions/valid';
import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_EKS,
  CLOUDBEAT_GCP,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  SUPPORTED_CLOUDBEAT_INPUTS,
  SUPPORTED_POLICY_TEMPLATES,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';
import type {
  AwsCredentialsType,
  PostureInput,
  CloudSecurityPolicyTemplate,
} from '../../../common/types_old';
import { cloudPostureIntegrations } from '../../common/constants';
import { DEFAULT_EKS_VARS_GROUP } from './eks_credentials_form';
import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  DEFAULT_AWS_CREDENTIALS_TYPE,
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
} from './aws_credentials_form/get_aws_credentials_form_options';

// Posture policies only support the default namespace
export const POSTURE_NAMESPACE = 'default';

type PosturePolicyInput =
  | { type: typeof CLOUDBEAT_AZURE; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_GCP; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_AWS; policy_template: typeof CSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_VANILLA; policy_template: typeof KSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_EKS; policy_template: typeof KSPM_POLICY_TEMPLATE }
  | { type: typeof CLOUDBEAT_VULN_MGMT_AWS; policy_template: typeof VULN_MGMT_POLICY_TEMPLATE };

// Extend NewPackagePolicyInput with known string literals for input type and policy template
export type NewPackagePolicyPostureInput = NewPackagePolicyInput & PosturePolicyInput;

export const isPostureInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyPostureInput =>
  SUPPORTED_POLICY_TEMPLATES.includes(input.policy_template as CloudSecurityPolicyTemplate) &&
  SUPPORTED_CLOUDBEAT_INPUTS.includes(input.type as PostureInput);

const getPostureType = (policyTemplateInput: PostureInput) => {
  switch (policyTemplateInput) {
    case CLOUDBEAT_AWS:
    case CLOUDBEAT_AZURE:
    case CLOUDBEAT_GCP:
      return 'cspm';
    case CLOUDBEAT_VANILLA:
    case CLOUDBEAT_EKS:
      return 'kspm';
    case CLOUDBEAT_VULN_MGMT_AWS:
      return 'vuln_mgmt';
    default:
      return 'n/a';
  }
};

const getDeploymentType = (policyTemplateInput: PostureInput) => {
  switch (policyTemplateInput) {
    case CLOUDBEAT_AWS:
    case CLOUDBEAT_VULN_MGMT_AWS:
      return 'aws';
    case CLOUDBEAT_AZURE:
      return 'azure';
    case CLOUDBEAT_GCP:
      return 'gcp';
    case CLOUDBEAT_VANILLA:
      return 'self_managed';
    case CLOUDBEAT_EKS:
      return 'eks';
    default:
      return 'n/a';
  }
};

const getPostureInput = (
  input: NewPackagePolicyInput,
  inputType: PostureInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
) => {
  const isInputEnabled = input.type === inputType;

  return {
    ...input,
    enabled: isInputEnabled,
    streams: input.streams.map((stream) => ({
      ...stream,
      enabled: isInputEnabled,
      // Merge new vars with existing vars
      ...(isInputEnabled &&
        inputVars && {
          vars: {
            ...stream.vars,
            ...inputVars,
          },
        }),
    })),
  };
};

/**
 * Get a new object with the updated policy input and vars
 */
export const getPosturePolicy = (
  newPolicy: NewPackagePolicy,
  inputType: PostureInput,
  inputVars?: Record<string, PackagePolicyConfigRecordEntry>
): NewPackagePolicy => ({
  ...newPolicy,
  namespace: POSTURE_NAMESPACE,
  // Enable new policy input and disable all others
  inputs: newPolicy.inputs.map((item) => getPostureInput(item, inputType, inputVars)),
  // Set hidden policy vars
  vars: merge({}, newPolicy.vars, {
    deployment: { value: getDeploymentType(inputType) },
    posture: { value: getPostureType(inputType) },
  }),
});

type RegistryPolicyTemplateWithInputs = RegistryPolicyTemplate & {
  inputs: Array<{
    vars?: RegistryVarsEntry[];
  }>;
};
// type guard for checking inputs
export const hasPolicyTemplateInputs = (
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyTemplateWithInputs => {
  return policyTemplate.hasOwnProperty('inputs');
};

export const getVulnMgmtCloudFormationDefaultValue = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const vulnMgmtPolicyTemplate = packageInfo.policy_templates.find(
    (p) => p.name === VULN_MGMT_POLICY_TEMPLATE
  );
  if (!vulnMgmtPolicyTemplate) return '';

  const vulnMgmtInputs =
    hasPolicyTemplateInputs(vulnMgmtPolicyTemplate) && vulnMgmtPolicyTemplate.inputs;

  if (!vulnMgmtInputs) return '';

  const cloudFormationTemplate = vulnMgmtInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'cloud_formation_template')?.default;
    return template ? String(template) : acc;
  }, '');

  return cloudFormationTemplate;
};

export const getCspmCloudFormationDefaultValue = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === CSPM_POLICY_TEMPLATE);
  if (!policyTemplate) return '';

  const policyTemplateInputs = hasPolicyTemplateInputs(policyTemplate) && policyTemplate.inputs;

  if (!policyTemplateInputs) return '';

  const cloudFormationTemplate = policyTemplateInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'cloud_formation_template')?.default;
    return template ? String(template) : acc;
  }, '');

  return cloudFormationTemplate;
};

export const getArmTemplateUrlFromCspmPackage = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === CSPM_POLICY_TEMPLATE);
  if (!policyTemplate) return '';

  const policyTemplateInputs = hasPolicyTemplateInputs(policyTemplate) && policyTemplate.inputs;
  if (!policyTemplateInputs) return '';

  const armTemplateUrl = policyTemplateInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'arm_template_url')?.default;
    return template ? String(template) : acc;
  }, '');

  return armTemplateUrl;
};

export const getDefaultAwsCredentialsType = (
  packageInfo: PackageInfo,
  setupTechnology?: SetupTechnology
): AwsCredentialsType => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  }

  const hasCloudFormationTemplate = !!getCspmCloudFormationDefaultValue(packageInfo);
  if (hasCloudFormationTemplate) {
    return DEFAULT_AWS_CREDENTIALS_TYPE;
  }

  return DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE;
};

export const getDefaultAzureCredentialsType = (
  packageInfo: PackageInfo,
  setupTechnology?: SetupTechnology
): string => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return 'service_principal_with_client_secret';
  }

  const hasArmTemplateUrl = !!getArmTemplateUrlFromCspmPackage(packageInfo);
  if (hasArmTemplateUrl) {
    return 'arm_template';
  }

  return 'managed_identity';
};

export const getDefaultGcpHiddenVars = (
  packageInfo: PackageInfo,
  setupTechnology?: SetupTechnology
): Record<string, PackagePolicyConfigRecordEntry> => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return {
      'gcp.credentials.type': {
        value: 'credentials-json',
        type: 'text',
      },
      setup_access: {
        value: 'manual',
        type: 'text',
      },
    };
  }

  const hasCloudShellUrl = !!getCspmCloudShellDefaultValue(packageInfo);
  if (hasCloudShellUrl) {
    return {
      'gcp.credentials.type': {
        value: 'credentials-none',
        type: 'text',
      },
      setup_access: {
        value: 'google_cloud_shell',
        type: 'text',
      },
    };
  }

  return {
    'gcp.credentials.type': {
      value: 'credentials-file',
      type: 'text',
    },
    setup_access: {
      value: 'manual',
      type: 'text',
    },
  };
};

/**
 * Input vars that are hidden from the user
 */
export const getPostureInputHiddenVars = (
  inputType: PostureInput,
  packageInfo: PackageInfo,
  setupTechnology: SetupTechnology
): Record<string, PackagePolicyConfigRecordEntry> | undefined => {
  switch (inputType) {
    case 'cloudbeat/cis_aws':
      return {
        'aws.credentials.type': {
          value: getDefaultAwsCredentialsType(packageInfo, setupTechnology),
          type: 'text',
        },
      };
    case 'cloudbeat/cis_azure':
      return {
        'azure.credentials.type': {
          value: getDefaultAzureCredentialsType(packageInfo, setupTechnology),
          type: 'text',
        },
      };
    case 'cloudbeat/cis_gcp':
      return getDefaultGcpHiddenVars(packageInfo, setupTechnology);
    case 'cloudbeat/cis_eks':
      return { 'aws.credentials.type': { value: DEFAULT_EKS_VARS_GROUP, type: 'text' } };
    default:
      return undefined;
  }
};

export const getPolicyTemplateInputOptions = (policyTemplate: CloudSecurityPolicyTemplate) =>
  cloudPostureIntegrations[policyTemplate].options.map((o) => ({
    tooltip: o.tooltip,
    value: o.type,
    id: o.type,
    label: o.name,
    icon: o.icon,
    disabled: o.disabled,
    isBeta: o.isBeta,
    testId: o.testId,
  }));

export const getMaxPackageName = (
  packageName: string,
  packagePolicies?: Array<{ name: string }>
) => {
  // Retrieve the highest number appended to package policy name and increment it by one
  const pkgPoliciesNamePattern = new RegExp(`${packageName}-(\\d+)`);

  const maxPkgPolicyName = Math.max(
    ...(packagePolicies ?? [])
      .filter((ds) => Boolean(ds.name.match(pkgPoliciesNamePattern)))
      .map((ds) => parseInt(ds.name.match(pkgPoliciesNamePattern)![1], 10)),
    0
  );

  return `${packageName}-${maxPkgPolicyName + 1}`;
};

export const getCspmCloudShellDefaultValue = (packageInfo: PackageInfo): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === CSPM_POLICY_TEMPLATE);
  if (!policyTemplate) return '';

  const policyTemplateInputs = hasPolicyTemplateInputs(policyTemplate) && policyTemplate.inputs;

  if (!policyTemplateInputs) return '';

  const cloudShellUrl = policyTemplateInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'cloud_shell_url')?.default;
    return template ? String(template) : acc;
  }, '');

  return cloudShellUrl;
};

export const getAwsCredentialsType = (
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>
): AwsCredentialsType | undefined => input.streams[0].vars?.['aws.credentials.type'].value;

export const isBelowMinVersion = (version: string, minVersion: string) => {
  const semanticVersion = semverValid(version);
  const versionNumberOnly = semverCoerce(semanticVersion) || '';
  return semverLt(versionNumberOnly, minVersion);
};

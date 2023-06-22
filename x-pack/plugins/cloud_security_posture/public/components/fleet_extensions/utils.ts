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
import merge from 'lodash/merge';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_VULN_MGMT_AWS,
  SUPPORTED_POLICY_TEMPLATES,
  SUPPORTED_CLOUDBEAT_INPUTS,
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';
import { DEFAULT_AWS_VARS_GROUP } from './aws_credentials_form';
import type { PostureInput, CloudSecurityPolicyTemplate } from '../../../common/types';
import { cloudPostureIntegrations } from '../../common/constants';

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
        stream.vars &&
        inputVars && {
          vars: merge({}, stream.vars, inputVars),
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

/**
 * Input vars that are hidden from the user
 */
export const getPostureInputHiddenVars = (inputType: PostureInput) => {
  switch (inputType) {
    case 'cloudbeat/cis_aws':
    case 'cloudbeat/cis_eks':
      return { 'aws.credentials.type': { value: DEFAULT_AWS_VARS_GROUP } };
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
  }));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { createNewPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import {
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_AWS,
} from '../../../common/constants';
import type { PostureInput } from '../../../common/types';

export const getMockPolicyAWS = () => getPolicyMock(CLOUDBEAT_AWS);
export const getMockPolicyK8s = () => getPolicyMock(CLOUDBEAT_VANILLA);
export const getMockPolicyEKS = () => getPolicyMock(CLOUDBEAT_EKS);

const getPolicyMock = (type: PostureInput): NewPackagePolicy => {
  const mockPackagePolicy = createNewPackagePolicyMock();

  const awsVarsMock = {
    access_key_id: { type: 'text' },
    secret_access_key: { type: 'text' },
    session_token: { type: 'text' },
    shared_credential_file: { type: 'text' },
    credential_profile_name: { type: 'text' },
    role_arn: { type: 'text' },
    'aws.credentials.type': { value: 'assume_role', type: 'text' },
  };

  const dataStream = { type: 'logs', dataset: 'cloud_security_posture.findings' };

  return {
    ...mockPackagePolicy,
    name: 'cloud_security_posture-policy',
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management (CSPM/KSPM)',
      version: '1.1.1',
    },
    vars: {
      posture: {
        value: type === CLOUDBEAT_VANILLA || type === CLOUDBEAT_EKS ? 'kspm' : 'cspm',
        type: 'text',
      },
      deployment: { value: type, type: 'text' },
    },
    inputs: [
      {
        type: CLOUDBEAT_VANILLA,
        policy_template: 'kspm',
        enabled: type === CLOUDBEAT_VANILLA,
        streams: [{ enabled: type === CLOUDBEAT_VANILLA, data_stream: dataStream }],
      },
      {
        type: CLOUDBEAT_EKS,
        policy_template: 'kspm',
        enabled: type === CLOUDBEAT_EKS,
        streams: [{ enabled: type === CLOUDBEAT_EKS, data_stream: dataStream, vars: awsVarsMock }],
      },
      {
        type: CLOUDBEAT_AWS,
        policy_template: 'cspm',
        enabled: type === CLOUDBEAT_AWS,
        streams: [{ enabled: type === CLOUDBEAT_AWS, data_stream: dataStream, vars: awsVarsMock }],
      },
      {
        type: CLOUDBEAT_GCP,
        policy_template: 'cspm',
        enabled: false,
        streams: [{ enabled: false, data_stream: dataStream }],
      },
      {
        type: CLOUDBEAT_AZURE,
        policy_template: 'cspm',
        enabled: false,
        streams: [{ enabled: false, data_stream: dataStream }],
      },
    ],
  };
};

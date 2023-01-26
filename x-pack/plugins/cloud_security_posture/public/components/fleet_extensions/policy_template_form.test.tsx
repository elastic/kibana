/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { PolicyTemplateVarsForm } from './policy_template_form';
import { TestProvider } from '../../test/test_provider';
import { getMockPolicyAWS, getMockPolicyEKS } from './mocks';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import userEvent from '@testing-library/user-event';
import { getPosturePolicy } from './utils';
import { CLOUDBEAT_AWS, CLOUDBEAT_EKS } from '../../../common/constants';

describe('<PolicyTemplateForm />', () => {
  const onChange = jest.fn();

  const WrappedComponent = ({ newPolicy }: { newPolicy: NewPackagePolicy }) => (
    <TestProvider>
      <PolicyTemplateVarsForm newPolicy={newPolicy} onChange={onChange} />
    </TestProvider>
  );

  beforeEach(() => {
    onChange.mockClear();
  });

  /**
   * AWS Credentials input fields tests for KSPM/CSPM integrations
   */
  const awsInputs = {
    [CLOUDBEAT_EKS]: getMockPolicyEKS,
    [CLOUDBEAT_AWS]: getMockPolicyAWS,
  };

  for (const [inputKey, getPolicy] of Object.entries(awsInputs) as Array<
    [keyof typeof awsInputs, typeof awsInputs[keyof typeof awsInputs]]
  >) {
    it(`renders ${inputKey} Assume Role fields`, () => {
      let policy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'assume_role' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const option = getByLabelText('Assume role');

      expect(option).toBeChecked();
      expect(getByLabelText('Role ARN')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Assume Role fields`, () => {
      let policy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'assume_role' },
      });
      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Role ARN'), 'a');
      policy = getPosturePolicy(policy, inputKey, { role_arn: { value: 'a' } });

      expect(onChange).toHaveBeenNthCalledWith(1, {
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${inputKey} Direct Access Keys fields`, () => {
      let policy: NewPackagePolicy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'direct_access_keys' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const option = getByLabelText('Direct access keys');

      expect(option).toBeChecked();
      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Direct Access Keys fields`, () => {
      let policy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'direct_access_keys' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, inputKey, { access_key_id: { value: 'a' } });

      expect(onChange).toHaveBeenNthCalledWith(1, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, inputKey, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${inputKey} Temporary Keys fields`, () => {
      let policy: NewPackagePolicy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'temporary_keys' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const option = getByLabelText('Temporary keys');

      expect(option).toBeChecked();
      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
      expect(getByLabelText('Session Token')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Temporary Keys fields`, () => {
      let policy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'temporary_keys' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, inputKey, { access_key_id: { value: 'a' } });

      expect(onChange).toHaveBeenNthCalledWith(1, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, inputKey, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Session Token'), 'a');
      policy = getPosturePolicy(policy, inputKey, { session_token: { value: 'a' } });

      expect(onChange).toHaveBeenNthCalledWith(3, {
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${inputKey} Shared Credentials fields`, () => {
      let policy: NewPackagePolicy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'shared_credentials' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const option = getByLabelText('Shared credentials');

      expect(option).toBeChecked();
      expect(getByLabelText('Shared Credential File')).toBeInTheDocument();
      expect(getByLabelText('Credential Profile Name')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Shared Credentials fields`, () => {
      let policy = getPolicy();
      policy = getPosturePolicy(policy, inputKey, {
        'aws.credentials.type': { value: 'shared_credentials' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Shared Credential File'), 'a');
      policy = getPosturePolicy(policy, inputKey, {
        shared_credential_file: { value: 'a' },
      });

      expect(onChange).toHaveBeenNthCalledWith(1, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Credential Profile Name'), 'b');
      policy = getPosturePolicy(policy, inputKey, {
        credential_profile_name: { value: 'b' },
      });

      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });
    });
  }
});

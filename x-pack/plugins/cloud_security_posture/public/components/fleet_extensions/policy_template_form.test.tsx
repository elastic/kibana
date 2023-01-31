/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CspPolicyTemplateForm } from './policy_template_form';
import { TestProvider } from '../../test/test_provider';
import { getMockPolicyAWS, getMockPolicyEKS, getMockPolicyK8s } from './mocks';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import userEvent from '@testing-library/user-event';
import { getPosturePolicy } from './utils';
import { CLOUDBEAT_AWS, CLOUDBEAT_EKS } from '../../../common/constants';

describe('<CspPolicyTemplateForm />', () => {
  const onChange = jest.fn();

  const WrappedComponent = ({
    newPolicy,
    edit = false,
  }: {
    edit?: boolean;
    newPolicy: NewPackagePolicy;
  }) => (
    <TestProvider>
      <CspPolicyTemplateForm newPolicy={newPolicy} onChange={onChange} edit={edit} />
    </TestProvider>
  );

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders KSPM input selector', () => {
    const { getByLabelText } = render(<WrappedComponent newPolicy={getMockPolicyK8s()} />);

    const option1 = getByLabelText('Self-Managed/Vanilla Kubernetes');
    const option2 = getByLabelText('EKS (Elastic Kubernetes Service)');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option1).toBeEnabled();
    expect(option2).toBeEnabled();
    expect(option1).toBeChecked();
  });

  it('updates selected KSPM input', () => {
    const k8sPolicy = getMockPolicyK8s();
    const eksPolicy = getMockPolicyEKS();

    const { getByLabelText } = render(<WrappedComponent newPolicy={k8sPolicy} />);
    const option = getByLabelText('EKS (Elastic Kubernetes Service)');
    userEvent.click(option);

    // Listen to the 2nd triggered by the test.
    // The 1st is done on mount to ensure initial state is valid.
    expect(onChange).toHaveBeenNthCalledWith(2, {
      isValid: true,
      updatedPolicy: eksPolicy,
    });
  });

  it('renders CSPM input selector', () => {
    const { getByLabelText } = render(<WrappedComponent newPolicy={getMockPolicyAWS()} />);

    const option1 = getByLabelText('Amazon Web Services');
    const option2 = getByLabelText('GCP');
    const option3 = getByLabelText('Azure');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1).toBeEnabled();
    expect(option2).toBeDisabled();
    expect(option3).toBeDisabled();
    expect(option1).toBeChecked();
  });

  it('renders disabled KSPM input when editing', () => {
    const { getByLabelText } = render(
      <WrappedComponent newPolicy={getMockPolicyK8s()} edit={true} />
    );

    const option1 = getByLabelText('Self-Managed/Vanilla Kubernetes');
    const option2 = getByLabelText('EKS (Elastic Kubernetes Service)');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option1).toBeDisabled();
    expect(option2).toBeDisabled();
    expect(option1).toBeChecked();
  });

  it('renders disabled CSPM input when editing', () => {
    const { getByLabelText } = render(
      <WrappedComponent newPolicy={getMockPolicyAWS()} edit={true} />
    );

    const option1 = getByLabelText('Amazon Web Services');
    const option2 = getByLabelText('GCP');
    const option3 = getByLabelText('Azure');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1).toBeDisabled();
    expect(option2).toBeDisabled();
    expect(option3).toBeDisabled();
    expect(option1).toBeChecked();
  });

  it('selects default KSPM input selector', () => {
    const policy = getMockPolicyK8s();
    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'kspm',
    }));

    render(<WrappedComponent newPolicy={policy} />);

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: getMockPolicyK8s(),
    });
  });

  it('selects default CSPM input selector', () => {
    const policy = getMockPolicyAWS();
    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'cspm',
    }));

    render(<WrappedComponent newPolicy={policy} />);

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: getMockPolicyAWS(),
    });
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

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
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

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, inputKey, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenNthCalledWith(3, {
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

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, inputKey, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenNthCalledWith(3, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Session Token'), 'a');
      policy = getPosturePolicy(policy, inputKey, { session_token: { value: 'a' } });

      expect(onChange).toHaveBeenNthCalledWith(4, {
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

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Credential Profile Name'), 'b');
      policy = getPosturePolicy(policy, inputKey, {
        credential_profile_name: { value: 'b' },
      });

      expect(onChange).toHaveBeenNthCalledWith(3, {
        isValid: true,
        updatedPolicy: policy,
      });
    });
  }
});

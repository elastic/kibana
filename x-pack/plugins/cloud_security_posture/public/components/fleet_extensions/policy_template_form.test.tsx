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
import { useParams } from 'react-router-dom';
import { PosturePolicyTemplate } from '../../../common/types';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

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
    (useParams as jest.Mock).mockReturnValue({ integration: 'kspm' });

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
    (useParams as jest.Mock).mockReturnValue({ integration: 'kspm' });

    const k8sPolicy = getMockPolicyK8s();
    const eksPolicy = getMockPolicyEKS();

    const { getByLabelText } = render(<WrappedComponent newPolicy={k8sPolicy} />);
    const option = getByLabelText('EKS (Elastic Kubernetes Service)');
    userEvent.click(option);

    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: eksPolicy,
    });
  });

  it('renders CSPM input selector', () => {
    (useParams as jest.Mock).mockReturnValue({ integration: 'cspm' });

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
    (useParams as jest.Mock).mockReturnValue({ integration: 'kspm' });

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
    (useParams as jest.Mock).mockReturnValue({ integration: 'cspm' });

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

  /**
   * AWS Credentials input fields tests for KSPM/CSPM integrations
   */
  const awsInputs = {
    [CLOUDBEAT_EKS]: ['kspm', getMockPolicyEKS],
    [CLOUDBEAT_AWS]: ['cspm', getMockPolicyAWS],
  };

  for (const [inputKey, [integration, getPolicy]] of Object.entries(awsInputs) as Array<
    [
      keyof typeof awsInputs,
      [PosturePolicyTemplate, typeof getMockPolicyEKS | typeof getMockPolicyAWS]
    ]
  >) {
    it(`renders ${inputKey} Assume Role fields`, () => {
      (useParams as jest.Mock).mockReturnValue({ integration });

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
      (useParams as jest.Mock).mockReturnValue({ integration });

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
      (useParams as jest.Mock).mockReturnValue({ integration });

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
      (useParams as jest.Mock).mockReturnValue({ integration });

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
      (useParams as jest.Mock).mockReturnValue({ integration });

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
      (useParams as jest.Mock).mockReturnValue({ integration });

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
      (useParams as jest.Mock).mockReturnValue({ integration });

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
      (useParams as jest.Mock).mockReturnValue({ integration });

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

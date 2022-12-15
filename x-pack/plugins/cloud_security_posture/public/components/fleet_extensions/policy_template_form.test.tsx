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
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import userEvent from '@testing-library/user-event';
import { getPolicyWithInputVars } from './utils';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility'),
  useGeneratedHtmlId: () => `id-${Math.random()}`,
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
    const { getByText } = render(<WrappedComponent newPolicy={getMockPolicyK8s()} />);

    const option1 = getByText('Self-Managed/Vanilla Kubernetes', { selector: 'button span' });
    const option2 = getByText('EKS (Elastic Kubernetes Service)', { selector: 'button span' });

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option1.parentElement).toBeEnabled();
    expect(option2.parentElement).toBeEnabled();
    expect(option1.querySelector('input')).toBeChecked();
  });

  it('updates selected KSPM input', () => {
    const k8sPolicy = getMockPolicyK8s();
    const eksPolicy = getMockPolicyEKS();

    const { getByText } = render(<WrappedComponent newPolicy={k8sPolicy} />);
    const span = getByText('EKS (Elastic Kubernetes Service)', { selector: 'button span' });
    userEvent.click(span);

    // Listen to the 2nd triggered by the test.
    // The 1st is done on mount to ensure initial state is valid.
    expect(onChange).toHaveBeenNthCalledWith(2, {
      isValid: true,
      updatedPolicy: eksPolicy,
    });
  });

  it('renders CSPM input selector', () => {
    const { getByText } = render(<WrappedComponent newPolicy={getMockPolicyAWS()} />);

    const option1 = getByText('Amazon Web Services', { selector: 'button span' });
    const option2 = getByText('GCP', { selector: 'button span' });
    const option3 = getByText('Azure', { selector: 'button span' });

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1).toBeEnabled();
    expect(option2.parentElement).toBeDisabled();
    expect(option3.parentElement).toBeDisabled();
    expect(option1.querySelector('input')).toBeChecked();
  });

  it('renders disabled KSPM input when editing', () => {
    const { getByText } = render(<WrappedComponent newPolicy={getMockPolicyK8s()} edit={true} />);

    const option1 = getByText('Self-Managed/Vanilla Kubernetes', { selector: 'button span' });
    const option2 = getByText('EKS (Elastic Kubernetes Service)', { selector: 'button span' });

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option1.parentElement).toBeDisabled();
    expect(option2.parentElement).toBeDisabled();
    expect(option1.querySelector('input')).toBeChecked();
  });

  it('renders disabled CSPM input when editing', () => {
    const { getByText } = render(<WrappedComponent newPolicy={getMockPolicyAWS()} edit={true} />);

    const option1 = getByText('Amazon Web Services', { selector: 'button span' });
    const option2 = getByText('GCP', { selector: 'button span' });
    const option3 = getByText('Azure', { selector: 'button span' });

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1.parentElement).toBeDisabled();
    expect(option2.parentElement).toBeDisabled();
    expect(option3.parentElement).toBeDisabled();
    expect(option1.querySelector('input')).toBeChecked();
  });

  /**
   * AWS Credentials input fields tests for KSPM/CSPM integrations
   */
  const inputs = {
    'cloudbeat/cis_eks': getMockPolicyEKS,
    'cloudbeat/cis_aws': getMockPolicyAWS,
  };

  for (const [inputKey, getPolicy] of Object.entries(inputs)) {
    it(`renders ${inputKey} Assume Role fields`, () => {
      let policy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'assume_role');

      const { getByText, getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const button = getByText('Assume role', { selector: 'button span' });

      expect(button.querySelector('input')).toBeChecked();
      expect(getByLabelText('Role ARN')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Assume Role fields`, () => {
      let policy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'assume_role');
      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Role ARN'), 'a');
      policy = getPolicyWithInputVars(policy, 'role_arn', 'a');

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${inputKey} Direct Access Keys fields`, () => {
      let policy: NewPackagePolicy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'direct_access_keys');

      const { getByText, getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const button = getByText('Direct access keys', { selector: 'button span' });

      expect(button.querySelector('input')).toBeChecked();
      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Direct Access Keys fields`, () => {
      let policy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'direct_access_keys');
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPolicyWithInputVars(policy, 'access_key_id', 'a');

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPolicyWithInputVars(policy, 'secret_access_key', 'b');

      expect(onChange).toHaveBeenNthCalledWith(3, {
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${inputKey} Temporary Keys fields`, () => {
      let policy: NewPackagePolicy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'temporary_keys');

      const { getByText, getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const button = getByText('Temporary keys', { selector: 'button span' });

      expect(button.querySelector('input')).toBeChecked();
      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
      expect(getByLabelText('Session Token')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Temporary Keys fields`, () => {
      let policy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'temporary_keys');
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPolicyWithInputVars(policy, 'access_key_id', 'a');

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPolicyWithInputVars(policy, 'secret_access_key', 'b');

      expect(onChange).toHaveBeenNthCalledWith(3, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Session Token'), 'a');
      policy = getPolicyWithInputVars(policy, 'session_token', 'a');

      expect(onChange).toHaveBeenNthCalledWith(4, {
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${inputKey} Shared Credentials fields`, () => {
      let policy: NewPackagePolicy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'shared_credentials');

      const { getByText, getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      const button = getByText('Shared credentials', { selector: 'button span' });

      expect(button.querySelector('input')).toBeChecked();
      expect(getByLabelText('Shared Credential File')).toBeInTheDocument();
      expect(getByLabelText('Credential Profile Name')).toBeInTheDocument();
    });

    it(`updates ${inputKey} Shared Credentials fields`, () => {
      let policy = getPolicy();
      policy = getPolicyWithInputVars(policy, 'aws.credentials.type', 'shared_credentials');
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Shared Credential File'), 'a');
      policy = getPolicyWithInputVars(policy, 'shared_credential_file', 'a');

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Credential Profile Name'), 'b');
      policy = getPolicyWithInputVars(policy, 'credential_profile_name', 'b');

      expect(onChange).toHaveBeenNthCalledWith(3, {
        isValid: true,
        updatedPolicy: policy,
      });
    });
  }
});

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
import {
  getMockPackageInfoVulnMgmtAWS,
  getMockPolicyAWS,
  getMockPolicyEKS,
  getMockPolicyK8s,
  getMockPolicyVulnMgmtAWS,
} from './mocks';
import type {
  AgentPolicy,
  NewPackagePolicy,
  PackageInfo,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import userEvent from '@testing-library/user-event';
import { getPosturePolicy } from './utils';
import { CLOUDBEAT_AWS, CLOUDBEAT_EKS } from '../../../common/constants';
import { useParams } from 'react-router-dom';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { usePackagePolicyList } from '../../common/api/use_package_policy_list';

// mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({
    integration: undefined,
  }),
}));
jest.mock('../../common/api/use_setup_status_api');
jest.mock('../../common/api/use_package_policy_list');

const onChange = jest.fn();

describe('<CspPolicyTemplateForm />', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({
      integration: undefined,
    });
    (usePackagePolicyList as jest.Mock).mockImplementation((packageName) =>
      createReactQueryResponse({
        status: 'success',
        data: {
          items: [],
        },
      })
    );
    onChange.mockClear();
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPackageVersion: '1.2.13' },
      })
    );
  });

  const WrappedComponent = ({
    newPolicy,
    edit = false,
    agentPolicy,
    packageInfo = {} as PackageInfo,
  }: {
    edit?: boolean;
    newPolicy: NewPackagePolicy;
    agentPolicy?: AgentPolicy;
    packageInfo?: PackageInfo;
    onChange?: jest.Mock<void, [NewPackagePolicy]>;
  }) => (
    <TestProvider>
      {edit && (
        <CspPolicyTemplateForm
          policy={newPolicy as PackagePolicy}
          newPolicy={newPolicy}
          onChange={onChange}
          packageInfo={packageInfo}
          isEditPage={true}
          agentPolicy={agentPolicy}
        />
      )}
      {!edit && (
        <CspPolicyTemplateForm
          newPolicy={newPolicy}
          onChange={onChange}
          packageInfo={packageInfo}
          isEditPage={false}
          agentPolicy={agentPolicy}
        />
      )}
    </TestProvider>
  );

  it('updates package policy namespace to default when it changes', () => {
    const policy = getMockPolicyK8s();
    const { rerender } = render(<WrappedComponent newPolicy={policy} />);

    rerender(<WrappedComponent newPolicy={{ ...policy, namespace: 'some-namespace' }} />);

    // Listen to the onChange triggered by the test (re-render with new policy namespace)
    // It should ensure the initial state is valid.
    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: {
        ...policy,
        namespace: 'default',
      },
    });
  });

  it('renders and updates name field', () => {
    const policy = getMockPolicyK8s();
    const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
    const name = getByLabelText('Name');
    expect(name).toBeInTheDocument();

    userEvent.type(name, '1');

    // Listen to the 2nd triggered by the test.
    // The 1st is done on mount to ensure initial state is valid.
    expect(onChange).toHaveBeenNthCalledWith(2, {
      isValid: true,
      updatedPolicy: { ...policy, name: `${policy.name}1` },
    });
  });

  it('renders and updates description field', () => {
    const policy = getMockPolicyK8s();
    const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
    const description = getByLabelText('Description');
    expect(description).toBeInTheDocument();

    userEvent.type(description, '1');

    // Listen to the 2nd triggered by the test.
    // The 1st is done on mount to ensure initial state is valid.
    expect(onChange).toHaveBeenNthCalledWith(2, {
      isValid: true,
      updatedPolicy: { ...policy, description: `${policy.description}1` },
    });
  });

  it('renders KSPM input selector', () => {
    const { getByLabelText } = render(<WrappedComponent newPolicy={getMockPolicyK8s()} />);

    const option1 = getByLabelText('Self-Managed');
    const option2 = getByLabelText('EKS');

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
    const option = getByLabelText('EKS');
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

    const option1 = getByLabelText('Self-Managed');
    const option2 = getByLabelText('EKS');

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
    policy.name = 'cloud_security_posture-1';

    (useParams as jest.Mock).mockReturnValue({
      integration: 'kspm',
    });

    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );

    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          items: [
            getPosturePolicy(getMockPolicyAWS(), CLOUDBEAT_AWS),
            getPosturePolicy(getMockPolicyEKS(), CLOUDBEAT_EKS),
            getPosturePolicy(getMockPolicyVulnMgmtAWS(), CLOUDBEAT_AWS),
          ],
        },
      })
    );

    render(
      <WrappedComponent
        newPolicy={policy}
        packageInfo={{ name: 'kspm' } as PackageInfo}
        onChange={onChange}
      />
    );

    onChange({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'kspm',
        })),
        name: 'kspm-2',
      },
    });

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments kspm template enabled input
    expect(onChange).toHaveBeenNthCalledWith(2, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'kspm',
        })),
        name: 'kspm-1',
      },
    });

    expect(onChange).toHaveBeenNthCalledWith(3, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'kspm',
        })),
        name: 'kspm-2',
      },
    });
  });

  it('selects default VULN_MGMT input selector', () => {
    const policy = getMockPolicyVulnMgmtAWS();
    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'vuln_mgmt',
    }));
    policy.name = 'cloud_security_posture-1';

    (useParams as jest.Mock).mockReturnValue({
      integration: 'vuln_mgmt',
    });
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          vuln_mgmt: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );
    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          items: [
            getPosturePolicy(getMockPolicyAWS(), CLOUDBEAT_AWS),
            getPosturePolicy(getMockPolicyEKS(), CLOUDBEAT_EKS),
            getPosturePolicy(getMockPolicyVulnMgmtAWS(), CLOUDBEAT_AWS),
          ],
        },
      })
    );

    render(
      <WrappedComponent
        newPolicy={policy}
        packageInfo={{ name: 'vuln_mgmt' } as PackageInfo}
        onChange={onChange}
      />
    );

    onChange({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'vuln_mgmt',
        })),
        name: 'vuln_mgmt-2',
      },
    });

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments vuln_mgmt template enabled input
    expect(onChange).toHaveBeenNthCalledWith(2, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'vuln_mgmt',
        })),
        name: 'vuln_mgmt-1',
      },
    });

    // 3rd call happens on mount and increments vuln_mgmt template enabled input
    expect(onChange).toHaveBeenNthCalledWith(3, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'vuln_mgmt',
        })),
        name: 'vuln_mgmt-2',
      },
    });
  });

  it('selects default CSPM input selector', () => {
    const policy = getMockPolicyAWS();
    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'cspm',
    }));
    policy.name = 'cloud_security_posture-1';

    (useParams as jest.Mock).mockReturnValue({
      integration: 'cspm',
    });
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          cspm: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );
    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          items: [
            getPosturePolicy(getMockPolicyAWS(), CLOUDBEAT_AWS),
            getPosturePolicy(getMockPolicyEKS(), CLOUDBEAT_EKS),
            getPosturePolicy(getMockPolicyVulnMgmtAWS(), CLOUDBEAT_AWS),
          ],
        },
      })
    );

    render(
      <WrappedComponent
        newPolicy={policy}
        packageInfo={{ name: 'cspm' } as PackageInfo}
        onChange={onChange}
      />
    );

    onChange({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'cspm',
        })),
        name: 'cspm-2',
      },
    });

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments cspm template enabled input
    expect(onChange).toHaveBeenNthCalledWith(2, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'cspm',
        })),
        name: 'cspm-1',
      },
    });

    // 3rd call happens on mount and increments cspm template enabled input
    expect(onChange).toHaveBeenNthCalledWith(3, {
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'cspm',
        })),
        name: 'cspm-2',
      },
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

  describe('Vuln Mgmt', () => {
    it('Update Agent Policy CloudFormation template from vars', () => {
      const policy = getMockPolicyVulnMgmtAWS();

      const packageInfo = getMockPackageInfoVulnMgmtAWS();
      render(<WrappedComponent newPolicy={policy} packageInfo={packageInfo} />);

      const expectedUpdatedPolicy = {
        ...policy,
        inputs: policy.inputs.map((input) => {
          if (input.type === 'cloudbeat/vuln_mgmt_aws') {
            return {
              ...input,
              config: { cloud_formation_template_url: { value: 's3_url' } },
            };
          }
          return input;
        }),
      };

      expect(onChange).toHaveBeenNthCalledWith(2, {
        isValid: true,
        updatedPolicy: expectedUpdatedPolicy,
      });
    });
  });
});

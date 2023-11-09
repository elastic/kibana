/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import {
  CspPolicyTemplateForm,
  AWS_ORGANIZATION_ACCOUNT,
  AWS_SINGLE_ACCOUNT,
  GCP_ORGANIZATION_ACCOUNT,
  GCP_SINGLE_ACCOUNT,
} from './policy_template_form';
import { TestProvider } from '../../test/test_provider';
import {
  getMockPackageInfoCspmAWS,
  getMockPackageInfoCspmAzure,
  getMockPackageInfoCspmGCP,
  getMockPackageInfoVulnMgmtAWS,
  getMockPolicyAWS,
  getMockPolicyAzure,
  getMockPolicyEKS,
  getMockPolicyGCP,
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
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_EKS,
  CLOUDBEAT_GCP,
} from '../../../common/constants';
import { useParams } from 'react-router-dom';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { usePackagePolicyList } from '../../common/api/use_package_policy_list';
import { CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS } from './gcp_credential_form';

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

const createReactQueryResponseWithRefetch = (
  data: Parameters<typeof createReactQueryResponse>[0]
) => {
  return {
    ...createReactQueryResponse(data),
    refetch: jest.fn(),
  };
};

describe('<CspPolicyTemplateForm />', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({
      integration: undefined,
    });
    (usePackagePolicyList as jest.Mock).mockImplementation((packageName) =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          items: [],
        },
      })
    );
    onChange.mockClear();
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
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

    const option1 = getByLabelText('AWS');
    const option2 = getByLabelText('GCP');
    const option3 = getByLabelText('Azure');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1).toBeEnabled();
    expect(option2).toBeEnabled();
    expect(option3).toBeEnabled();
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

    const option1 = getByLabelText('AWS');
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
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          kspm: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );

    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
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
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments kspm template enabled input
    expect(onChange).toHaveBeenCalledWith({
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

    expect(onChange).toHaveBeenCalledWith({
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
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          vuln_mgmt: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );
    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
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
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments vuln_mgmt template enabled input
    expect(onChange).toHaveBeenCalledWith({
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
    expect(onChange).toHaveBeenCalledWith({
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
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          cspm: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );
    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
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
        packageInfo={getMockPackageInfoCspmAWS()}
        onChange={onChange}
      />
    );

    // 1st call happens on mount and selects the CloudFormation template
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        name: 'cloud_security_posture-1',
        inputs: policy.inputs.map((input) => {
          if (input.type === CLOUDBEAT_AWS) {
            return {
              ...input,
              enabled: true,
            };
          }
          return input;
        }),
      },
    });

    // 2nd call happens on mount and increments cspm template enabled input
    expect(onChange).toHaveBeenCalledWith({
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

    // // 3rd call happens on mount and increments cspm template enabled input
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        inputs: policy.inputs.map((input) => {
          if (input.type === CLOUDBEAT_AWS) {
            return {
              ...input,
              enabled: true,
              config: { cloud_formation_template_url: { value: 's3_url' } },
            };
          }
          return input;
        }),
        name: 'cloud_security_posture-1',
      },
    });

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

    expect(onChange).toHaveBeenCalledWith({
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

  describe('K8S', () => {
    it('K8S or KSPM Vanilla should not render any Setup Access option', () => {
      const policy = getMockPolicyK8s();

      const { queryByTestId } = render(<WrappedComponent newPolicy={policy} />);

      expect(queryByTestId('assumeRoleTestId')).not.toBeInTheDocument();
      expect(queryByTestId('directAccessKeyTestId')).not.toBeInTheDocument();
      expect(queryByTestId('temporaryKeyTestId')).not.toBeInTheDocument();
      expect(queryByTestId('sharedCredentialsTestId')).not.toBeInTheDocument();
    });
  });

  describe('EKS Credentials input fields', () => {
    it(`documentation Hyperlink should have correct URL to redirect users to AWS page`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByText } = render(<WrappedComponent newPolicy={policy} />);

      expect(getByText('documentation')).toHaveAttribute(
        'href',
        'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html'
      );
    });
    it(`renders ${CLOUDBEAT_EKS} Assume Role fields`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      const option = getByLabelText('Assume role');
      expect(option).toBeChecked();

      expect(getByLabelText('Role ARN')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_EKS} Assume Role fields`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Role ARN'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { role_arn: { value: 'a' } });

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_EKS} Direct Access Keys fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      const option = getByLabelText('Direct access keys');
      expect(option).toBeChecked();

      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_EKS} Direct Access Keys fields`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { access_key_id: { value: 'a' } });

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_EKS} Temporary Keys fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'temporary_keys' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      const option = getByLabelText('Temporary keys');
      expect(option).toBeChecked();

      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
      expect(getByLabelText('Session Token')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_EKS} Temporary Keys fields`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'temporary_keys' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { access_key_id: { value: 'a' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Session Token'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { session_token: { value: 'a' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_EKS} Shared Credentials fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'shared_credentials' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      const option = getByLabelText('Shared credentials');
      expect(option).toBeChecked();

      expect(getByLabelText('Shared Credential File')).toBeInTheDocument();
      expect(getByLabelText('Credential Profile Name')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_EKS} Shared Credentials fields`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'shared_credentials' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Shared Credential File'), 'a');

      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        shared_credential_file: { value: 'a' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Credential Profile Name'), 'b');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        credential_profile_name: { value: 'b' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });

  describe('AWS Credentials input fields', () => {
    it(`renders ${CLOUDBEAT_AWS} Account Type field, AWS Organization is enabled for supported versions`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.account_type': { value: AWS_ORGANIZATION_ACCOUNT },
      });

      const { getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={{ version: '1.5.0' } as PackageInfo} />
      );

      expect(getByLabelText('Single Account')).toBeInTheDocument();
      expect(getByLabelText('AWS Organization')).toBeInTheDocument();
      expect(getByLabelText('AWS Organization')).toBeEnabled();
    });

    it(`${CLOUDBEAT_AWS} form displays upgrade message for unsupported versions and aws organization option is disabled`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'cloud_formation' },
        'aws.account_type': { value: AWS_SINGLE_ACCOUNT },
      });

      const { getByText, getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={{ version: '1.4.0' } as PackageInfo} />
      );

      expect(
        getByText(
          'AWS Organization not supported in current integration version. Please upgrade to the latest version to enable AWS Organizations integration.'
        )
      ).toBeInTheDocument();
      expect(getByLabelText('AWS Organization')).toBeDisabled();
      expect(getByLabelText('Single Account')).toBeEnabled();
    });

    it(`${CLOUDBEAT_AWS} form do not displays upgrade message for supported versions and aws organization option is enabled`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'cloud_formation' },
        'aws.account_type': { value: AWS_ORGANIZATION_ACCOUNT },
      });

      const { queryByText, getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={{ version: '1.5.0' } as PackageInfo} />
      );

      expect(
        queryByText(
          'AWS Organization not supported in current integration version. Please upgrade to the latest version to enable AWS Organizations integration.'
        )
      ).not.toBeInTheDocument();
      expect(getByLabelText('AWS Organization')).toBeEnabled();
    });

    it(`Getting started Hyperlink should have correct URL to redirect users to elastic page`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByText } = render(<WrappedComponent newPolicy={policy} />);

      expect(getByText('Getting Started')).toHaveAttribute(
        'href',
        'https://ela.st/cspm-get-started'
      );
    });

    it(`documentation Hyperlink should have correct URL to redirect users to elastic page if user chose Manual`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmAWS()} />
      );

      expect(getByTestId('externalLink')).toHaveAttribute(
        'href',
        'https://ela.st/cspm-get-started'
      );
    });

    it(`documentation Hyperlink should have correct URL to redirect users to AWS page if user chose Cloudformation`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'cloud_formation' },
        'aws.account_type': { value: 'single-account' },
      });

      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmAWS()} />
      );

      expect(getByTestId('externalLink')).toHaveAttribute(
        'href',
        'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
      );
    });

    it(`renders ${CLOUDBEAT_AWS} Assume Role fields`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText, getByRole } = render(<WrappedComponent newPolicy={policy} />);

      expect(getByRole('option', { name: 'Assume role', selected: true })).toBeInTheDocument();

      expect(getByLabelText('Role ARN')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_AWS} Assume Role fields`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Role ARN'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, { role_arn: { value: 'a' } });

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_AWS} Direct Access Keys fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText, getByRole } = render(<WrappedComponent newPolicy={policy} />);

      expect(
        getByRole('option', { name: 'Direct access keys', selected: true })
      ).toBeInTheDocument();

      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_AWS} Direct Access Keys fields`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, { access_key_id: { value: 'a' } });

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_AWS} Temporary Keys fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'temporary_keys' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText, getByRole } = render(<WrappedComponent newPolicy={policy} />);
      expect(getByRole('option', { name: 'Temporary keys', selected: true })).toBeInTheDocument();

      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
      expect(getByLabelText('Session Token')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_AWS} Temporary Keys fields`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'temporary_keys' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, { access_key_id: { value: 'a' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Secret Access Key'), 'b');
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, { secret_access_key: { value: 'b' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Session Token'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, { session_token: { value: 'a' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_AWS} Shared Credentials fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'shared_credentials' },
      });

      const { getByLabelText, getByRole } = render(<WrappedComponent newPolicy={policy} />);

      expect(
        getByRole('option', { name: 'Shared credentials', selected: true })
      ).toBeInTheDocument();

      expect(getByLabelText('Shared Credential File')).toBeInTheDocument();
      expect(getByLabelText('Credential Profile Name')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_AWS} Shared Credentials fields`, () => {
      let policy = getMockPolicyAWS();
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'shared_credentials' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Shared Credential File'), 'a');

      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        shared_credential_file: { value: 'a' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      userEvent.type(getByLabelText('Credential Profile Name'), 'b');
      policy = getPosturePolicy(policy, CLOUDBEAT_AWS, {
        credential_profile_name: { value: 'b' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });

  describe('Vuln Mgmt', () => {
    it('Update Agent Policy CloudFormation template from vars', () => {
      const policy = getMockPolicyVulnMgmtAWS();

      const packageInfo = getMockPackageInfoVulnMgmtAWS();
      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={packageInfo} />
      );

      expect(getByTestId('additionalChargeCalloutTestSubj')).toBeInTheDocument();
    });

    it('Additional Charge Callout message should be rendered', () => {
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

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: expectedUpdatedPolicy,
      });
    });
  });

  describe('GCP Credentials input fields', () => {
    it(`renders ${CLOUDBEAT_GCP} Not supported when version is not at least version 1.5.2`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        credentials_type: { value: 'credentials-file' },
        setup_access: { value: 'manual' },
      });

      const { getByText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP('1.3.1')} />
      );
      expect(onChange).toHaveBeenCalledWith({
        isValid: false,
        updatedPolicy: policy,
      });

      expect(
        getByText(
          'CIS GCP is not supported on the current Integration version, please upgrade your integration to the latest version to use CIS GCP'
        )
      ).toBeInTheDocument();
    });

    it(`documentation Hyperlink should have correct URL to redirect users to elastic page`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        credentials_type: { value: 'credentials-file' },
        setup_access: { value: 'manual' },
      });

      const { getByText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      expect(getByText('documentation')).toHaveAttribute('href', 'https://ela.st/cspm-get-started');
    });

    it(`renders Google Cloud Shell forms when Setup Access is set to Google Cloud Shell`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
        setup_access: { value: 'google_cloud_shell' },
      });

      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      expect(
        getByTestId(CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.GOOGLE_CLOUD_SHELL_SETUP)
      ).toBeInTheDocument();
    });

    it(`renders ${CLOUDBEAT_GCP} Credentials File fields`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.type': { value: 'credentials-file' },
        setup_access: { value: 'manual' },
      });

      const { getByLabelText, getByRole } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      expect(getByRole('option', { name: 'Credentials File', selected: true })).toBeInTheDocument();

      expect(
        getByLabelText('Path to JSON file containing the credentials and key used to subscribe')
      ).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_GCP} Credentials File fields`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.project_id': { value: 'a' },
        'gcp.credentials.type': { value: 'credentials-file' },
        setup_access: { value: 'manual' },
      });

      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      userEvent.type(getByTestId(CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE), 'b');

      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.file': { value: 'b' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_GCP} Credentials JSON fields`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        setup_access: { value: 'manual' },
        'gcp.credentials.type': { value: 'credentials-json' },
      });

      const { getByRole, getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      expect(getByRole('option', { name: 'Credentials JSON', selected: true })).toBeInTheDocument();

      expect(
        getByLabelText('JSON blob containing the credentials and key used to subscribe')
      ).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_GCP} Credentials JSON fields`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.project_id': { value: 'a' },
        'gcp.credentials.type': { value: 'credentials-json' },
        setup_access: { value: 'manual' },
      });

      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      userEvent.type(getByTestId(CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON), 'b');

      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.json': { value: 'b' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`${CLOUDBEAT_GCP} form do not displays upgrade message for supported versions and gcp organization option is enabled`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.type': { value: 'manual' },
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
      });

      const { queryByText, getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={{ version: '1.6.0' } as PackageInfo} />
      );

      expect(
        queryByText(
          'GCP Organization not supported in current integration version. Please upgrade to the latest version to enable GCP Organizations integration.'
        )
      ).not.toBeInTheDocument();
      expect(getByLabelText('GCP Organization')).toBeEnabled();
    });

    it(`renders ${CLOUDBEAT_GCP} Organization fields when account type is Organization and Setup Access is Google Cloud Shell`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
        setup_access: { value: 'google_cloud_shell' },
      });

      const { getByLabelText, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      expect(getByTestId(CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)).toBeInTheDocument();

      expect(getByLabelText('Organization ID')).toBeInTheDocument();
    });

    it(`renders ${CLOUDBEAT_GCP} Organization fields when account type is Organization and Setup Access is manual`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
        setup_access: { value: 'manual' },
      });

      const { getByLabelText, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      expect(getByTestId(CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)).toBeInTheDocument();

      expect(getByLabelText('Organization ID')).toBeInTheDocument();
    });

    it(`Should not render ${CLOUDBEAT_GCP} Organization fields when account type is Single`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_SINGLE_ACCOUNT },
        setup_access: { value: 'google_cloud_shell' },
      });

      const { queryByLabelText, queryByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      expect(queryByTestId(CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)).toBeNull();

      expect(queryByLabelText('Organization ID')).toBeNull();
    });

    it(`updates ${CLOUDBEAT_GCP} organization id`, () => {
      let policy = getMockPolicyGCP();
      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
        setup_access: { value: 'manual' },
      });

      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmGCP()} />
      );

      userEvent.type(getByTestId(CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID), 'c');

      policy = getPosturePolicy(policy, CLOUDBEAT_GCP, {
        'gcp.organization_id': { value: 'c' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });

  describe('Azure Credentials input fields', () => {
    it(`renders ${CLOUDBEAT_AZURE} Not supported when version is not at least version 1.6.0`, () => {
      let policy = getMockPolicyAzure();
      policy = getPosturePolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.type': { value: 'arm_template' },
        'azure.account_type': { value: 'single-account' },
      });

      const { getByText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmAzure('1.5.0')} />
      );

      expect(onChange).toHaveBeenCalledWith({
        isValid: false,
        updatedPolicy: policy,
      });

      expect(
        getByText(
          'CIS Azure is not supported on the current Integration version, please upgrade your integration to the latest version to use CIS Azure'
        )
      ).toBeInTheDocument();
    });

    it(`selects default ${CLOUDBEAT_AZURE} fields`, () => {
      let policy = getMockPolicyAzure();
      policy = getPosturePolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.type': { value: 'arm_template' },
        'azure.account_type': { value: 'single-account' },
      });

      render(<WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoCspmAzure()} />);

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });
});

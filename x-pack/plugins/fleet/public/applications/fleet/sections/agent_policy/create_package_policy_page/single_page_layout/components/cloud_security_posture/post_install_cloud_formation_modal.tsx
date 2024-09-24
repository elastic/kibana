/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@tanstack/react-query';

import { useAgentPolicyWithPackagePolicies } from '../../../../../../../../components/agent_enrollment_flyout/hooks';

import type { AgentPolicy, PackagePolicy } from '../../../../../../types';
import { sendGetEnrollmentAPIKeys, useFleetServerHostsForPolicy } from '../../../../../../hooks';

import { CloudFormationGuide } from '../../../../../../../../components/cloud_security_posture';
import { getCloudFormationPropsFromPackagePolicy } from '../../../../../../../../components/cloud_security_posture/services';
import { useCreateCloudFormationUrl } from '../../../../../../../../components/cloud_security_posture/hooks';

export const PostInstallCloudFormationModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  agentPolicy: AgentPolicy;
  packagePolicy: PackagePolicy;
}> = ({ onConfirm, onCancel, agentPolicy, packagePolicy }) => {
  const { data: apiKeysData, isLoading } = useQuery(['cloudFormationApiKeys'], () =>
    sendGetEnrollmentAPIKeys({
      page: 1,
      perPage: 1,
      kuery: `policy_id:${agentPolicy.id}`,
    })
  );

  const { agentPolicyWithPackagePolicies } = useAgentPolicyWithPackagePolicies(agentPolicy.id);
  const { fleetServerHost, isLoadingInitialRequest } = useFleetServerHostsForPolicy(
    agentPolicyWithPackagePolicies
  );

  const cloudFormationProps = getCloudFormationPropsFromPackagePolicy(packagePolicy);

  const { cloudFormationUrl, error, isError } = useCreateCloudFormationUrl({
    enrollmentAPIKey: apiKeysData?.data?.items[0]?.api_key,
    cloudFormationProps,
    fleetServerHost,
  });

  return (
    <EuiModal data-test-subj="postInstallCloudFormationModal" onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="confirmCloudFormationModalTitleText">
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallCloudFormationModalTitle"
            defaultMessage="CloudFormation deployment"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <CloudFormationGuide awsAccountType={cloudFormationProps.awsAccountType} />
        {error && isError && !isLoadingInitialRequest && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut title={error} color="danger" iconType="error" />
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="confirmCloudFormationModalCancelButton" onClick={onCancel}>
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallCloudFormationModal.cancelButton"
            defaultMessage="Launch CloudFormation later"
          />
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="confirmCloudFormationModalConfirmButton"
          onClick={() => {
            window.open(cloudFormationUrl);
            onConfirm();
          }}
          fill
          color="primary"
          isLoading={isLoading}
          isDisabled={isError}
        >
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallCloudFormationModalConfirmButtonLabel"
            defaultMessage="Launch CloudFormation"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

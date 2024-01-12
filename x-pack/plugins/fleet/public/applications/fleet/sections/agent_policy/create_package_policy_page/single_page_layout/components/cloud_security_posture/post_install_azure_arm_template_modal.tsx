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

import { AzureArmTemplateGuide } from '../../../../../../../../components/cloud_security_posture';
import { getAzureArmPropsFromPackagePolicy } from '../../../../../../../../components/cloud_security_posture/services';
import { useCreateAzureArmTemplateUrl } from '../../../../../../../../components/cloud_security_posture/hooks';

import type { AgentPolicy, PackagePolicy } from '../../../../../../types';
import { sendGetEnrollmentAPIKeys } from '../../../../../../hooks';

export const PostInstallAzureArmTemplateModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  agentPolicy: AgentPolicy;
  packagePolicy: PackagePolicy;
}> = ({ onConfirm, onCancel, agentPolicy, packagePolicy }) => {
  const { data: apyKeysData } = useQuery(
    ['azureArmTemplateApiKeys', { agentPolicyId: agentPolicy.id }],
    () =>
      sendGetEnrollmentAPIKeys({
        page: 1,
        perPage: 1,
        kuery: `policy_id:${agentPolicy.id}`,
      })
  );

  const azureArmTemplateProps = getAzureArmPropsFromPackagePolicy(packagePolicy);
  const enrollmentToken = apyKeysData?.data?.items[0]?.api_key;

  const { azureArmTemplateUrl, error, isError, isLoading } = useCreateAzureArmTemplateUrl({
    enrollmentAPIKey: enrollmentToken,
    azureArmTemplateProps,
  });

  return (
    <EuiModal data-test-subj="postInstallAzureArmTemplateModal" onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="confirmAzureArmTemplateModalTitleText">
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallAzureArmTemplateModalModalTitle"
            defaultMessage="ARM Template deployment"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <AzureArmTemplateGuide
          azureAccountType={azureArmTemplateProps.azureAccountType}
          agentPolicy={agentPolicy}
          enrollmentToken={enrollmentToken}
        />
        {error && isError && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut title={error} color="danger" iconType="error" />
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="confirmAzureArmTemplateModalCancelButton"
          onClick={onCancel}
        >
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallAzureArmTemplateModal.cancelButton"
            defaultMessage="Add ARM Template later"
          />
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="confirmAzureArmTemplateModalConfirmButton"
          onClick={() => {
            window.open(azureArmTemplateUrl);
            onConfirm();
          }}
          fill
          color="primary"
          isLoading={isLoading}
          isDisabled={isError}
        >
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallAzureArmTemplateModalConfirmButtonLabel"
            defaultMessage="Launch ARM Template"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

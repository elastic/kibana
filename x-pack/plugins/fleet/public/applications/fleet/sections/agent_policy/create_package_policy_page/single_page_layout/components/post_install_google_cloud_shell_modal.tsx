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

import type { AgentPolicy, PackagePolicy } from '../../../../../types';
import {
  sendGetEnrollmentAPIKeys,
  useCreateCloudShellUrl,
  useFleetServerHostsForPolicy,
  useKibanaVersion,
} from '../../../../../hooks';
import { GoogleCloudShellGuide } from '../../../../../components';
import { ManualInstructions } from '../../../../../../../components/enrollment_instructions';

export const PostInstallGoogleCloudShellModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  agentPolicy: AgentPolicy;
  packagePolicy: PackagePolicy;
}> = ({ onConfirm, onCancel, agentPolicy, packagePolicy }) => {
  const { data: apyKeysData } = useQuery(['googleCloudShellApiKeys'], () =>
    sendGetEnrollmentAPIKeys({
      page: 1,
      perPage: 1,
      kuery: `policy_id:${agentPolicy.id}`,
    })
  );
  const { fleetServerHosts, fleetProxy } = useFleetServerHostsForPolicy(agentPolicy);
  const kibanaVersion = useKibanaVersion();

  const installManagedCommands = ManualInstructions({
    apiKey: apyKeysData?.data?.items[0]?.api_key || 'no_key',
    fleetServerHosts,
    fleetProxy,
    kibanaVersion,
  });

  const { cloudShellUrl, error, isError, isLoading } = useCreateCloudShellUrl({
    enrollmentAPIKey: apyKeysData?.data?.items[0]?.api_key,
    packagePolicy,
  });

  return (
    <EuiModal data-test-subj="postInstallGoogleCloudShellModal" onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="confirmGoogleCloudShellTitleText">
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallGoogleCloudShellModalTitle"
            defaultMessage="Google Cloud Shell deployment"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <GoogleCloudShellGuide commandText={installManagedCommands.googleCloudShell} />
        {error && isError && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut title={error} color="danger" iconType="error" />
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="confirmGoogleCloudShellModalCancelButton"
          onClick={onCancel}
        >
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallGoogleCloudShellModal.cancelButton"
            defaultMessage="Launch Google Cloud Shell later"
          />
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="confirmGoogleCloudShellModalConfirmButton"
          onClick={() => {
            window.open(cloudShellUrl);
            onConfirm();
          }}
          fill
          color="primary"
          isLoading={isLoading}
          isDisabled={isError}
        >
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallGoogleCloudShellModalConfirmButtonLabel"
            defaultMessage="Launch Google Cloud Shell"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

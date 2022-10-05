/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { WithGuidedOnboardingTour } from '../../../../../../integrations/sections/epm/screens/detail/components/with_guided_onboarding_tour';
import { useIsGuidedOnboardingActive } from '../../../../../../../hooks';
import type { AgentPolicy, PackageInfo } from '../../../../../types';

const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.substr(1);

export const PostInstallAddAgentModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  packageInfo: PackageInfo;
  agentPolicy: AgentPolicy;
}> = ({ onConfirm, onCancel, packageInfo, agentPolicy }) => {
  const isGuidedOnboardingActive = useIsGuidedOnboardingActive(packageInfo.name);

  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.postInstallAddAgentModal"
          defaultMessage="{packageName} integration added"
          values={{
            packageName: toTitleCase(packageInfo.title),
          }}
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.postInstallAddAgentModalCancelButtonLabel"
          defaultMessage="Add Elastic Agent later"
        />
      }
      confirmButtonText={
        <WithGuidedOnboardingTour
          packageKey={packageInfo.name}
          tourType="agentModalButton"
          isGuidedOnboardingActive={isGuidedOnboardingActive}
          tourPosition="downCenter"
        >
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallAddAgentModalConfirmButtonLabel"
            defaultMessage="Add Elastic Agent to your hosts"
          />
        </WithGuidedOnboardingTour>
      }
      buttonColor="primary"
      data-test-subj="postInstallAddAgentModal"
    >
      <FormattedMessage
        id="xpack.fleet.agentPolicy.postInstallAddAgentModalDescription"
        defaultMessage="To complete this integration, add {elasticAgent} to your hosts to collect data and send it to Elastic Stack"
        values={{
          elasticAgent: <strong>Elastic Agent</strong>,
        }}
      />
    </EuiConfirmModal>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface UnprivilegedConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  agentPolicyName: string;
  unprivilegedAgentsCount: number;
  dataStreams: Array<{ name: string; title: string }>;
}

export const UnprivilegedConfirmModal: React.FC<UnprivilegedConfirmModalProps> = ({
  onConfirm,
  onCancel,
  agentPolicyName,
  unprivilegedAgentsCount,
  dataStreams,
}: UnprivilegedConfirmModalProps) => {
  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="xpack.fleet.addIntegration.confirmModalTitle"
          defaultMessage="Confirm add integration"
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.addIntegration.confirmModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.addIntegration.confirmModal.confirmButtonLabel"
          defaultMessage="Add integration"
        />
      }
      buttonColor="warning"
    >
      <UnprivilegedAgentsCallout
        unprivilegedAgentsCount={unprivilegedAgentsCount}
        agentPolicyName={agentPolicyName}
        dataStreams={dataStreams}
      />
    </EuiConfirmModal>
  );
};

export const UnprivilegedAgentsCallout: React.FC<{
  agentPolicyName: string;
  unprivilegedAgentsCount: number;
  dataStreams: Array<{ name: string; title: string }>;
}> = ({ agentPolicyName, unprivilegedAgentsCount, dataStreams }) => {
  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      title={i18n.translate('xpack.fleet.addIntegration.confirmModal.unprivilegedAgentsTitle', {
        defaultMessage: 'Unprivileged agents enrolled to the selected policy',
      })}
      data-test-subj="unprivilegedAgentsCallout"
    >
      {dataStreams.length === 0 ? (
        <FormattedMessage
          id="xpack.fleet.addIntegration.confirmModal.unprivilegedAgentsMessage"
          defaultMessage="This integration requires Elastic Agents to have root privileges. There {unprivilegedAgentsCount, plural, one {is # agent} other {are # agents}} running in an unprivileged mode using {agentPolicyName}. To ensure that all data required by the integration can be collected, re-enroll the {unprivilegedAgentsCount, plural, one {agent} other {agents}} using an account with root privileges."
          values={{
            unprivilegedAgentsCount,
            agentPolicyName,
          }}
        />
      ) : (
        <>
          <FormattedMessage
            id="xpack.fleet.addIntegration.confirmModal.unprivilegedAgentsDataStreamsMessage"
            defaultMessage="This integration has the following data streams that require Elastic Agents to have root privileges. There {unprivilegedAgentsCount, plural, one {is # agent} other {are # agents}} running in an unprivileged mode using {agentPolicyName}. To ensure that all data required by the integration can be collected, re-enroll the {unprivilegedAgentsCount, plural, one {agent} other {agents}} using an account with root privileges."
            values={{
              unprivilegedAgentsCount,
              agentPolicyName,
            }}
          />
          <ul>
            {dataStreams.map((item) => (
              <li key={item.name}>{item.title}</li>
            ))}
          </ul>
        </>
      )}
    </EuiCallOut>
  );
};

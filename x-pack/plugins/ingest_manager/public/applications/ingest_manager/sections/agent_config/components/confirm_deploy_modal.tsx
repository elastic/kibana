/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiOverlayMask, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AgentConfig } from '../../../types';

export const ConfirmDeployConfigModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  agentCount: number;
  agentConfig: AgentConfig;
}> = ({ onConfirm, onCancel, agentCount, agentConfig }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.ingestManager.agentConfig.confirmModalTitle"
            defaultMessage="Save and deploy changes"
          />
        }
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={
          <FormattedMessage
            id="xpack.ingestManager.agentConfig.confirmModalCancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.ingestManager.agentConfig.confirmModalConfirmButtonLabel"
            defaultMessage="Save and deploy changes"
          />
        }
        buttonColor="primary"
      >
        <EuiCallOut
          iconType="iInCircle"
          title={i18n.translate('xpack.ingestManager.agentConfig.confirmModalCalloutTitle', {
            defaultMessage:
              'This action will update {agentCount, plural, one {# agent} other {# agents}}',
            values: {
              agentCount,
            },
          })}
        >
          <FormattedMessage
            id="xpack.ingestManager.agentConfig.confirmModalCalloutDescription"
            defaultMessage="Fleet has detected that the selected agent configuration, {configName}, is already in use by
            some of your agents. As a result of this action, Fleet will deploy updates to all agents
            that use this configuration."
            values={{
              configName: <b>{agentConfig.name}</b>,
            }}
          />
        </EuiCallOut>
        <EuiSpacer size="l" />
        <FormattedMessage
          id="xpack.ingestManager.agentConfig.confirmModalDescription"
          defaultMessage="This action can not be undone. Are you sure you wish to continue?"
        />
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

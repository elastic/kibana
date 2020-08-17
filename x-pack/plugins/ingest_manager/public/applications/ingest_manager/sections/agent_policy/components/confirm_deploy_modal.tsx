/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiOverlayMask, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AgentPolicy } from '../../../types';

export const ConfirmDeployAgentPolicyModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  agentCount: number;
  agentPolicy: AgentPolicy;
}> = ({ onConfirm, onCancel, agentCount, agentPolicy }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.ingestManager.agentPolicy.confirmModalTitle"
            defaultMessage="Save and deploy changes"
          />
        }
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={
          <FormattedMessage
            id="xpack.ingestManager.agentPolicy.confirmModalCancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.ingestManager.agentPolicy.confirmModalConfirmButtonLabel"
            defaultMessage="Save and deploy changes"
          />
        }
        buttonColor="primary"
      >
        <EuiCallOut
          iconType="iInCircle"
          title={i18n.translate('xpack.ingestManager.agentPolicy.confirmModalCalloutTitle', {
            defaultMessage:
              'This action will update {agentCount, plural, one {# agent} other {# agents}}',
            values: {
              agentCount,
            },
          })}
        >
          <div className="eui-textBreakWord">
            <FormattedMessage
              id="xpack.ingestManager.agentPolicy.confirmModalCalloutDescription"
              defaultMessage="Fleet has detected that the selected agent policy, {policyName}, is already in use by
            some of your agents. As a result of this action, Fleet will deploy updates to all agents
            that use this policy."
              values={{
                policyName: <b>{agentPolicy.name}</b>,
              }}
            />
          </div>
        </EuiCallOut>
        <EuiSpacer size="l" />
        <FormattedMessage
          id="xpack.ingestManager.agentPolicy.confirmModalDescription"
          defaultMessage="This action can not be undone. Are you sure you wish to continue?"
        />
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

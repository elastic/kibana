/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { AgentPolicy } from '../../../../fleet/common';

interface ConfirmDeployAgentPolicyModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  agentCount: number;
  agentPolicy: AgentPolicy;
}

const ConfirmDeployAgentPolicyModalComponent: React.FC<ConfirmDeployAgentPolicyModalProps> = ({
  onConfirm,
  onCancel,
  agentCount,
  agentPolicy,
}) => (
  <EuiConfirmModal
    title={
      <FormattedMessage
        id="xpack.osquery.agentPolicy.confirmModalTitle"
        defaultMessage="Save and deploy changes"
      />
    }
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={
      <FormattedMessage
        id="xpack.osquery.agentPolicy.confirmModalCancelButtonLabel"
        defaultMessage="Cancel"
      />
    }
    confirmButtonText={
      <FormattedMessage
        id="xpack.osquery.agentPolicy.confirmModalConfirmButtonLabel"
        defaultMessage="Save and deploy changes"
      />
    }
    buttonColor="primary"
  >
    <EuiCallOut
      iconType="iInCircle"
      title={i18n.translate('xpack.osquery.agentPolicy.confirmModalCalloutTitle', {
        defaultMessage:
          'This action will update {agentCount, plural, one {# agent} other {# agents}}',
        values: {
          agentCount,
        },
      })}
    >
      <div className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.osquery.agentPolicy.confirmModalCalloutDescription"
          defaultMessage="Fleet has detected that the selected agent policy, {policyName}, is already in use by
            some of your agents. As a result of this action, Fleet will deploy updates to all agents
            that use this policy."
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          values={{
            policyName: <b>{agentPolicy.name}</b>,
          }}
        />
      </div>
    </EuiCallOut>
    <EuiSpacer size="l" />
    <FormattedMessage
      id="xpack.osquery.agentPolicy.confirmModalDescription"
      defaultMessage="Are you sure you wish to continue?"
    />
  </EuiConfirmModal>
);

export const ConfirmDeployAgentPolicyModal = React.memo(ConfirmDeployAgentPolicyModalComponent);

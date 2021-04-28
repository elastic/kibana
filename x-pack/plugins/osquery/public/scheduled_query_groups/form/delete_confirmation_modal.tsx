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

interface ConfirmDeleteAgentPolicyModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  agentCount: number;
  agentPolicy: AgentPolicy;
}

const ConfirmDeleteAgentPolicyModalComponent: React.FC<ConfirmDeleteAgentPolicyModalProps> = ({
  onConfirm,
  onCancel,
  agentCount,
  agentPolicy,
}) => (
  <EuiConfirmModal
    title={
      <FormattedMessage
        id="xpack.osquery.agentPolicy.deleteConfirmModalTitle"
        defaultMessage="Delete scheduled query group?"
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
        id="xpack.osquery.agentPolicy.deleteConfirmModalConfirmButtonLabel"
        defaultMessage="Delete scheduled query group"
      />
    }
    buttonColor="danger"
  >
    <EuiCallOut
      color="danger"
      title={i18n.translate('xpack.osquery.agentPolicy.deleteConfirmModalCalloutTitle', {
        defaultMessage:
          'This action will affect {agentCount, plural, one {# agent} other {# agents}}.',
        values: {
          agentCount,
        },
      })}
    >
      <div className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.osquery.agentPolicy.deleteConfirmModalCalloutDescription"
          defaultMessage="Fleet has detected that {policyName} is already in use by some
           of your agents."
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          values={{
            policyName: <b>{agentPolicy.name}</b>,
          }}
        />
      </div>
    </EuiCallOut>
    <EuiSpacer size="l" />
    <FormattedMessage
      id="xpack.osquery.agentPolicy.deleteConfirmModalDescription"
      defaultMessage="Are you sure you wish to continue?"
    />
  </EuiConfirmModal>
);

export const ConfirmDeleteAgentPolicyModal = React.memo(ConfirmDeleteAgentPolicyModalComponent);

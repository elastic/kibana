/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useMemo } from 'react';
import { EuiPortal, EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent } from '../../../../types';
import { useCapabilities } from '../../../../hooks';
import { ContextMenuActions } from '../../../../components';
import { AgentUnenrollAgentModal, AgentReassignAgentPolicyFlyout } from '../../components';
import { useAgentRefresh } from '../hooks';

export const AgentDetailsActionMenu: React.FunctionComponent<{
  agent: Agent;
  assignFlyoutOpenByDefault?: boolean;
  onCancelReassign?: () => void;
}> = memo(({ agent, assignFlyoutOpenByDefault = false, onCancelReassign }) => {
  const hasWriteCapabilites = useCapabilities().write;
  const refreshAgent = useAgentRefresh();
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(assignFlyoutOpenByDefault);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
  const isUnenrolling = agent.status === 'unenrolling';

  const onClose = useMemo(() => {
    if (onCancelReassign) {
      return onCancelReassign;
    } else {
      return () => setIsReassignFlyoutOpen(false);
    }
  }, [onCancelReassign, setIsReassignFlyoutOpen]);

  return (
    <>
      {isReassignFlyoutOpen && (
        <EuiPortal>
          <AgentReassignAgentPolicyFlyout agents={[agent]} onClose={onClose} />
        </EuiPortal>
      )}
      {isUnenrollModalOpen && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={[agent]}
            agentCount={1}
            onClose={() => {
              setIsUnenrollModalOpen(false);
              refreshAgent();
            }}
            useForceUnenroll={isUnenrolling}
          />
        </EuiPortal>
      )}
      <ContextMenuActions
        button={{
          props: { iconType: 'arrowDown', iconSide: 'right' },
          children: (
            <FormattedMessage
              id="xpack.ingestManager.agentDetails.actionsButton"
              defaultMessage="Actions"
            />
          ),
        }}
        items={[
          <EuiContextMenuItem
            icon="pencil"
            onClick={() => {
              setIsReassignFlyoutOpen(true);
            }}
            disabled={!agent.active}
            key="reassignPolicy"
          >
            <FormattedMessage
              id="xpack.ingestManager.agentList.reassignActionText"
              defaultMessage="Assign to new policy"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            icon="cross"
            disabled={!hasWriteCapabilites || !agent.active}
            onClick={() => {
              setIsUnenrollModalOpen(true);
            }}
          >
            {isUnenrolling ? (
              <FormattedMessage
                id="xpack.ingestManager.agentList.forceUnenrollOneButton"
                defaultMessage="Force unenroll"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestManager.agentList.unenrollOneButton"
                defaultMessage="Unenroll agent"
              />
            )}
          </EuiContextMenuItem>,
        ]}
      />
    </>
  );
});

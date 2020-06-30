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
import { AgentUnenrollProvider, AgentReassignConfigFlyout } from '../../components';
import { useAgentRefresh } from '../hooks';

export const AgentDetailsActionMenu: React.FunctionComponent<{
  agent: Agent;
  assignFlyoutOpenByDefault?: boolean;
  onCancelReassign?: () => void;
}> = memo(({ agent, assignFlyoutOpenByDefault = false, onCancelReassign }) => {
  const hasWriteCapabilites = useCapabilities().write;
  const refreshAgent = useAgentRefresh();
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(assignFlyoutOpenByDefault);

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
          <AgentReassignConfigFlyout agent={agent} onClose={onClose} />
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
            key="reassignConfig"
          >
            <FormattedMessage
              id="xpack.ingestManager.agentList.reassignActionText"
              defaultMessage="Assign new agent config"
            />
          </EuiContextMenuItem>,
          <AgentUnenrollProvider key="unenrollAgent">
            {(unenrollAgentsPrompt) => (
              <EuiContextMenuItem
                icon="cross"
                disabled={!hasWriteCapabilites || !agent.active}
                onClick={() => {
                  unenrollAgentsPrompt([agent.id], 1, refreshAgent);
                }}
              >
                <FormattedMessage
                  id="xpack.ingestManager.agentList.unenrollOneButton"
                  defaultMessage="Unenroll"
                />
              </EuiContextMenuItem>
            )}
          </AgentUnenrollProvider>,
        ]}
      />
    </>
  );
});

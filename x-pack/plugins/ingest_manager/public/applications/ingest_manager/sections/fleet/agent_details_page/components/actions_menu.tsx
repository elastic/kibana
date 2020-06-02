/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useCallback } from 'react';
import { EuiButton, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent } from '../../../../types';
import { useCapabilities } from '../../../../hooks';
import { useAgentRefresh } from '../hooks';
import { AgentUnenrollProvider, AgentReassignConfigFlyout } from '../../components';

export const AgentDetailsActionMenu: React.FunctionComponent<{
  agent: Agent;
}> = memo(({ agent }) => {
  const hasWriteCapabilites = useCapabilities().write;
  const refreshAgent = useAgentRefresh();
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState<boolean>(false);
  const handleCloseMenu = useCallback(() => setIsActionsPopoverOpen(false), [
    setIsActionsPopoverOpen,
  ]);
  const handleToggleMenu = useCallback(() => setIsActionsPopoverOpen(!isActionsPopoverOpen), [
    isActionsPopoverOpen,
  ]);
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(false);

  return (
    <>
      {isReassignFlyoutOpen && (
        <AgentReassignConfigFlyout agent={agent} onClose={() => setIsReassignFlyoutOpen(false)} />
      )}
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        button={
          <EuiButton onClick={handleToggleMenu} iconType="arrowDown" iconSide="right">
            <FormattedMessage
              id="xpack.ingestManager.agentDetails.actionsButton"
              defaultMessage="Actions"
            />
          </EuiButton>
        }
        isOpen={isActionsPopoverOpen}
        closePopover={handleCloseMenu}
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              icon="pencil"
              onClick={() => {
                handleCloseMenu();
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
      </EuiPopover>
    </>
  );
});

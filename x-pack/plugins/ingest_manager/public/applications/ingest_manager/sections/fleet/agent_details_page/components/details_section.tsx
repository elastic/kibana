/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiButton,
  EuiPopover,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
  EuiIconTip,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAgentRefresh } from '../hooks';
import { AgentMetadataFlyout } from './metadata_flyout';
import { Agent } from '../../../../types';
import { AgentHealth } from '../../components/agent_health';
import { useCapabilities, useGetOneAgentConfig } from '../../../../hooks';
import { Loading } from '../../../../components';
import { ConnectedLink, AgentReassignConfigFlyout } from '../../components';
import { AgentUnenrollProvider } from '../../components/agent_unenroll_provider';

const Item: React.FunctionComponent<{ label: string }> = ({ label, children }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiDescriptionList compressed>
        <EuiDescriptionListTitle>{label}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{children}</EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
  );
};

function useFlyout() {
  const [isVisible, setVisible] = useState(false);
  return {
    isVisible,
    show: () => setVisible(true),
    hide: () => setVisible(false),
  };
}

interface Props {
  agent: Agent;
}
export const AgentDetailSection: React.FunctionComponent<Props> = ({ agent }) => {
  const hasWriteCapabilites = useCapabilities().write;
  const metadataFlyout = useFlyout();
  const refreshAgent = useAgentRefresh();
  // Actions menu
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const handleCloseMenu = useCallback(() => setIsActionsPopoverOpen(false), [
    setIsActionsPopoverOpen,
  ]);
  const handleToggleMenu = useCallback(() => setIsActionsPopoverOpen(!isActionsPopoverOpen), [
    isActionsPopoverOpen,
  ]);
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(false);

  // Fetch AgentConfig information
  const { isLoading: isAgentConfigLoading, data: agentConfigData } = useGetOneAgentConfig(
    agent.config_id
  );

  const items = [
    {
      title: i18n.translate('xpack.ingestManager.agentDetails.statusLabel', {
        defaultMessage: 'Status',
      }),
      description: <AgentHealth agent={agent} />,
    },
    {
      title: i18n.translate('xpack.ingestManager.agentDetails.idLabel', {
        defaultMessage: 'ID',
      }),
      description: agent.id,
    },
    {
      title: i18n.translate('xpack.ingestManager.agentDetails.typeLabel', {
        defaultMessage: 'Type',
      }),
      description: agent.type,
    },
    {
      title: i18n.translate('xpack.ingestManager.agentDetails.agentConfigLabel', {
        defaultMessage: 'AgentConfig',
      }),
      description: isAgentConfigLoading ? (
        <Loading />
      ) : agentConfigData && agentConfigData.item ? (
        <ConnectedLink color="primary" path={`/configs/${agent.config_id}`}>
          {agentConfigData.item.name}
        </ConnectedLink>
      ) : (
        <Fragment>
          <EuiIconTip
            position="bottom"
            color="primary"
            content={
              <FormattedMessage
                id="xpack.ingestManager.agentDetails.unavailableConfigTooltipText"
                defaultMessage="This config is no longer available"
              />
            }
          />{' '}
          <EuiTextColor color="subdued">{agent.config_id}</EuiTextColor>
        </Fragment>
      ),
    },
  ];

  return (
    <>
      {isReassignFlyoutOpen && (
        <AgentReassignConfigFlyout agent={agent} onClose={() => setIsReassignFlyoutOpen(false)} />
      )}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.ingestManager.agentDetails.agentDetailsTitle"
                defaultMessage="Agent detail"
              />
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="downRight"
            panelPaddingSize="none"
            button={
              <EuiButton onClick={handleToggleMenu}>
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

                <AgentUnenrollProvider>
                  {unenrollAgentsPrompt => (
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
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'xl'} />
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
        {items.map((item, idx) => (
          <Item key={idx} label={item.title}>
            {item.description}
          </Item>
        ))}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => metadataFlyout.show()}>View metadata</EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {metadataFlyout.isVisible && <AgentMetadataFlyout flyout={metadataFlyout} agent={agent} />}
    </>
  );
};

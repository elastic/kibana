/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiBetaBadge,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { WithHeaderLayout } from '../../layouts';
import { useLink, useGetAgentConfigs } from '../../hooks';
import { AgentEnrollmentFlyout } from '../fleet/agent_list_page/components';
import { EPM_PATH, FLEET_PATH, AGENT_CONFIG_PATH, DATA_STREAM_PATH } from '../../constants';

const OverviewPanel = styled(EuiPanel).attrs(props => ({
  paddingSize: 'm',
}))`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${props => props.theme.eui.euiColorLightShade};
    margin: -${props => props.theme.eui.paddingSizes.m} -${props => props.theme.eui.paddingSizes.m}
      ${props => props.theme.eui.paddingSizes.m};
    padding: ${props => props.theme.eui.paddingSizes.s} ${props => props.theme.eui.paddingSizes.m};
  }

  h2 {
    padding: ${props => props.theme.eui.paddingSizes.xs} 0;
  }
`;

const OverviewStats = styled(EuiDescriptionList).attrs(props => ({
  compressed: true,
  textStyle: 'reverse',
  type: 'column',
}))`
  & > * {
    margin-top: ${props => props.theme.eui.paddingSizes.s} !important;

    &:first-child,
    &:nth-child(2) {
      margin-top: 0 !important;
    }
  }
`;

const AlphaBadge = styled(EuiBetaBadge)`
  vertical-align: top;
  margin-left: ${props => props.theme.eui.paddingSizes.s};
`;

export const IngestManagerOverview: React.FunctionComponent = () => {
  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);

  // Agent configs required for enrollment flyout
  const agentConfigsRequest = useGetAgentConfigs({
    page: 1,
    perPage: 1000,
  });
  const agentConfigs = agentConfigsRequest.data ? agentConfigsRequest.data.items : [];

  return (
    <WithHeaderLayout
      leftColumn={
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageTitle"
                  defaultMessage="Ingest Manager"
                />
                <AlphaBadge
                  iconType="beaker"
                  label={i18n.translate('xpack.ingestManager.alphaBadge.labelText', {
                    defaultMessage: 'Experimental',
                  })}
                  title={i18n.translate('xpack.ingestManager.alphaBadge.titleText', {
                    defaultMessage: 'Experimental',
                  })}
                  tooltipContent={i18n.translate('xpack.ingestManager.alphaBadge.tooltipText', {
                    defaultMessage:
                      'This plugin might change or be removed in a future release and is not subject to the support SLA.',
                  })}
                />
              </h1>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageSubtitle"
                  defaultMessage="Centralized management for Elastic Agents and configurations."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      rightColumn={
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
              <FormattedMessage
                id="xpack.ingestManager.overviewPageEnrollAgentButton"
                defaultMessage="Enroll new agent"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {isEnrollmentFlyoutOpen && (
        <AgentEnrollmentFlyout
          agentConfigs={agentConfigs}
          onClose={() => setIsEnrollmentFlyoutOpen(false)}
        />
      )}

      <EuiFlexGrid gutterSize="l" columns={2}>
        <EuiFlexItem component="section">
          <OverviewPanel>
            <header>
              <EuiTitle size="xs">
                <h2>
                  <FormattedMessage
                    id="xpack.ingestManager.overviewPageIntegrationsPanelTitle"
                    defaultMessage="Integrations"
                  />
                </h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right" href={useLink(EPM_PATH)}>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageIntegrationsPanelAction"
                  defaultMessage="View integrations"
                />
              </EuiButtonEmpty>
            </header>
            <OverviewStats>
              <EuiDescriptionListTitle>Total available</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>999</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Installed</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>1</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Updated available</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0</EuiDescriptionListDescription>
            </OverviewStats>
          </OverviewPanel>
        </EuiFlexItem>

        <EuiFlexItem component="section">
          <OverviewPanel>
            <header>
              <EuiTitle size="xs">
                <h2>
                  <FormattedMessage
                    id="xpack.ingestManager.overviewPageConfigurationsPanelTitle"
                    defaultMessage="Configurations"
                  />
                </h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right" href={useLink(AGENT_CONFIG_PATH)}>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageConfigurationsPanelAction"
                  defaultMessage="View configs"
                />
              </EuiButtonEmpty>
            </header>
            <OverviewStats>
              <EuiDescriptionListTitle>Total configs</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>1</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Data sources</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>1</EuiDescriptionListDescription>
            </OverviewStats>
          </OverviewPanel>
        </EuiFlexItem>

        <EuiFlexItem component="section">
          <OverviewPanel>
            <header>
              <EuiTitle size="xs">
                <h2>
                  <FormattedMessage
                    id="xpack.ingestManager.overviewPageFleetPanelTitle"
                    defaultMessage="Fleet"
                  />
                </h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right" href={useLink(FLEET_PATH)}>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageFleetPanelAction"
                  defaultMessage="View agents"
                />
              </EuiButtonEmpty>
            </header>
            <OverviewStats>
              <EuiDescriptionListTitle>Total agents</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Active</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Offline</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Error</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0</EuiDescriptionListDescription>
            </OverviewStats>
          </OverviewPanel>
        </EuiFlexItem>

        <EuiFlexItem component="section">
          <OverviewPanel>
            <header>
              <EuiTitle size="xs">
                <h2>
                  <FormattedMessage
                    id="xpack.ingestManager.overviewPageDataStreamsPanelTitle"
                    defaultMessage="Data streams"
                  />
                </h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right" href={useLink(DATA_STREAM_PATH)}>
                <FormattedMessage
                  id="xpack.ingestManager.overviewPageDataStreamsPanelAction"
                  defaultMessage="View data streams"
                />
              </EuiButtonEmpty>
            </header>
            <OverviewStats>
              <EuiDescriptionListTitle>Data streams</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Name spaces</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Total size</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>0 MB</EuiDescriptionListDescription>
            </OverviewStats>
          </OverviewPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </WithHeaderLayout>
  );
};

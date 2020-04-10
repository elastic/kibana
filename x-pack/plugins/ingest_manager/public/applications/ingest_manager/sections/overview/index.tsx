/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
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
import { WithHeaderLayout } from '../../layouts';

const OverviewPanel = styled(EuiPanel)`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${props => props.theme.eui.euiColorLightShade};
    margin: -${props => props.theme.eui.paddingSizes.m} -${props => props.theme.eui.paddingSizes.m}
      0;
    padding: ${props => props.theme.eui.paddingSizes.s} ${props => props.theme.eui.paddingSizes.m};
  }

  h2 {
    padding: ${props => props.theme.eui.paddingSizes.xs} 0;
  }

  .euiDescriptionList {
    margin-top: ${props => props.theme.eui.paddingSizes.m};
  }
`;

const OverviewStats = styled(EuiDescriptionList)`
  margin-top: ${props => props.theme.eui.paddingSizes.m};

  &.euiDescriptionList.euiDescriptionList--column > * {
    margin-top: ${props => props.theme.eui.paddingSizes.s};

    &:first-child,
    &:nth-child(2) {
      margin-top: 0;
    }
  }
`;

OverviewStats.defaultProps = {
  compressed: true,
  textStyle: 'reverse',
  type: 'column',
};

OverviewPanel.defaultProps = {
  paddingSize: 'm',
};

export const IngestManagerOverview: React.FunctionComponent = () => {
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
            {/* TODO: this button should open the enroll agent flyout */}
            <EuiButton fill iconType="plusInCircle">
              Enroll new agent
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiFlexGrid gutterSize="l" columns={2}>
        <EuiFlexItem component="section">
          <OverviewPanel>
            <header>
              <EuiTitle size="xs">
                <h2>Integrations</h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right">
                View integrations
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
                <h2>Agent configurations</h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right">
                View configs
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
                <h2>Fleet</h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right">
                View agents
              </EuiButtonEmpty>
            </header>
            <OverviewStats>
              <EuiDescriptionListTitle>Total agents</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>999</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Active</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>1</EuiDescriptionListDescription>
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
                <h2>Data streams</h2>
              </EuiTitle>
              <EuiButtonEmpty size="xs" flush="right">
                View data streams
              </EuiButtonEmpty>
            </header>
            <OverviewStats>
              <EuiDescriptionListTitle>Data streams</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>999</EuiDescriptionListDescription>
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

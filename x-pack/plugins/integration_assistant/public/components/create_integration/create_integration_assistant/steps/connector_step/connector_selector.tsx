/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiRadio } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { css } from '@emotion/react';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import type { AIConnector } from '../../types';
import { useActions } from '../../state';

const useRowCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    &.euiPanel:hover,
    &.euiPanel:focus {
      box-shadow: none;
      transform: none;
    }
    &.euiPanel:hover {
      background-color: ${euiTheme.colors.lightestShade};
    }
    .euiRadio {
      color: ${euiTheme.colors.textPrimary};
      label.euiRadio__label {
        padding-left: ${euiTheme.size.xl} !important;
      }
    }
  `;
};

interface ConnectorSelectorProps {
  connectors: AIConnector[];
  selectedConnectorId: string | undefined;
}
export const ConnectorSelector = React.memo<ConnectorSelectorProps>(
  ({ connectors, selectedConnectorId }) => {
    const {
      triggersActionsUi: { actionTypeRegistry },
    } = useKibana().services;
    const { setConnector } = useActions();
    const rowCss = useRowCss();
    return (
      <EuiFlexGroup
        alignItems="stretch"
        direction="column"
        gutterSize="s"
        data-test-subj="connectorSelector"
      >
        {connectors.map((connector) => (
          <EuiFlexItem key={connector.id}>
            <EuiPanel
              key={connector.id}
              onClick={() => setConnector(connector)}
              hasShadow={false}
              hasBorder
              paddingSize="l"
              css={rowCss}
              data-test-subj={`connectorSelector-${connector.id}`}
            >
              <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiRadio
                    label={connector.name}
                    id={connector.id}
                    checked={selectedConnectorId === connector.id}
                    onChange={noop}
                    data-test-subj={`connectorSelectorRadio-${connector.id}${
                      selectedConnectorId === connector.id ? '-selected' : ''
                    }`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {actionTypeRegistry.get(connector.actionTypeId).actionTypeTitle}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
ConnectorSelector.displayName = 'ConnectorSelector';

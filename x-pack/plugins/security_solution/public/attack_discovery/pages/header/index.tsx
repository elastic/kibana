/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { noop } from 'lodash/fp';
import React from 'react';

import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import * as i18n from './translations';

interface Props {
  connectorId: string | undefined;
  connectorsAreConfigured: boolean;
  isLoading: boolean;
  onGenerate: () => void;
  onConnectorIdSelected: (connectorId: string) => void;
}

const HeaderComponent: React.FC<Props> = ({
  connectorId,
  connectorsAreConfigured,
  isLoading,
  onGenerate,
  onConnectorIdSelected,
}) => {
  const isFlyoutMode = false; // always false for attack discovery
  const { hasAssistantPrivilege } = useAssistantAvailability();
  const { euiTheme } = useEuiTheme();
  const disabled = !hasAssistantPrivilege || isLoading || connectorId == null;

  return (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        gap: ${euiTheme.size.m};
        margin-top: ${euiTheme.size.m};
      `}
      data-test-subj="header"
      gutterSize="none"
    >
      {connectorsAreConfigured && (
        <EuiFlexItem grow={false}>
          <ConnectorSelectorInline
            isFlyoutMode={isFlyoutMode}
            onConnectorSelected={noop}
            onConnectorIdSelected={onConnectorIdSelected}
            selectedConnectorId={connectorId}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={connectorId == null ? i18n.SELECT_A_CONNECTOR : null}
          data-test-subj="generateTooltip"
        >
          <EuiButton
            data-test-subj="generate"
            size="s"
            disabled={disabled}
            isLoading={isLoading}
            onClick={onGenerate}
          >
            {isLoading ? i18n.LOADING : i18n.GENERATE}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HeaderComponent.displayName = 'Header';
export const Header = React.memo(HeaderComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash/fp';
import React from 'react';

import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';

const GENERATE = i18n.translate(
  'xpack.securitySolution.aiInsights.poweredByGenerativeAi.generateButton',
  {
    defaultMessage: 'Generate',
  }
);

const LOADING = i18n.translate(
  'xpack.securitySolution.aiInsights.poweredByGenerativeAi.loadingButton',
  {
    defaultMessage: 'Loading...',
  }
);

interface Props {
  connectorId: string | undefined;
  isLoading: boolean;
  onGenerate: () => void;
  onConnectorIdSelected: (connectorId: string) => void;
}

const HeaderComponent: React.FC<Props> = ({
  connectorId,
  isLoading,
  onGenerate,
  onConnectorIdSelected,
}) => {
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
      <EuiFlexItem grow={false}>
        <ConnectorSelectorInline
          onConnectorSelected={noop}
          onConnectorIdSelected={onConnectorIdSelected}
          selectedConnectorId={connectorId}
          showLabel={false}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="generate"
          size="s"
          disabled={disabled}
          isLoading={isLoading}
          onClick={onGenerate}
        >
          {isLoading ? LOADING : GENERATE}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HeaderComponent.displayName = 'Header';
export const Header = React.memo(HeaderComponent);

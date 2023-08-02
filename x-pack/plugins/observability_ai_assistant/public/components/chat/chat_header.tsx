/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { AssistantAvatar } from '../assistant_avatar';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';

export function ChatHeader({
  title,
  connectors,
}: {
  title: string;
  connectors: UseGenAIConnectorsResult;
}) {
  const hasTitle = !!title;

  const displayedTitle =
    title ||
    i18n.translate('xpack.observabilityAiAssistant.emptyConversationTitle', {
      defaultMessage: 'New conversation',
    });

  const theme = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="l">
      <EuiFlexItem grow={false}>
        <AssistantAvatar size="l" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiTitle
              size="m"
              className={css`
                color: ${hasTitle ? theme.euiTheme.colors.text : theme.euiTheme.colors.subduedText};
              `}
            >
              <h2>{displayedTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectorSelectorBase {...connectors} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

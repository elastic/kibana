/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import { CoPilotConversation } from '../../../common/co_pilot';
import { CoPilotWithUiService } from '../../typings/co_pilot';
import { CoPilotCreateChatButton } from './co_pilot_create_chat_button';

export function CoPilotChatList({
  conversations,
  loading,
  error,
  coPilot,
}: {
  conversations: CoPilotConversation[] | undefined;
  loading: boolean;
  error?: string;
  coPilot: CoPilotWithUiService;
}) {
  const theme = useEuiTheme();

  if (!conversations?.length) {
    let content: React.ReactElement;

    if (loading) {
      content = <EuiLoadingSpinner size="s" />;
    } else if (error) {
      content = (
        <EuiCallOut color="warning" iconType="warning">
          {error}
        </EuiCallOut>
      );
    } else {
      content = (
        <EuiFlexGroup direction="column" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              {i18n.translate('xpack.observability.coPilotChatList.noConversations', {
                defaultMessage: 'No conversations... yet!',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CoPilotCreateChatButton coPilot={coPilot} fill />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>{content}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {conversations.map((conversation, index) => (
        <EuiFlexItem
          grow={false}
          css={css`
            ${index < conversations.length - 1
              ? `border-bottom: 1px solid ${theme.euiTheme.colors.lightestShade};`
              : ''}
            padding: ${theme.euiTheme.size.l};
          `}
        >
          <EuiButtonEmpty
            data-test-subj="CoPilotChatListButton"
            onClick={() => {
              coPilot.openConversation(conversation.conversation.id);
            }}
            css={css`
              .euiButtonContent {
                justify-content: flex-start;
              }
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>{conversation.conversation.title}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="clock" color="subdued" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="s">
                      <FormattedRelative value={conversation['@timestamp']} />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiButtonEmpty>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

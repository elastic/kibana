/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import {
  EuiText,
  EuiPanel,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  useEuiTheme,
  useEuiFontSize,
} from '@elastic/eui';
import type { ConversationSummary } from '../../../../../common/conversations';

interface ConversationGroupProps {
  conversations: ConversationSummary[];
  dateLabel: string;
  activeConversationId?: string;
  onConversationClick: (
    event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>,
    conversationId: string
  ) => void;
}

const fullHeightClassName = css`
  height: 100%;
`;

const groupLabelClassName = css`
  text-transform: uppercase;
`;

export const ConversationGroup: React.FC<ConversationGroupProps> = ({
  conversations,
  dateLabel,
  activeConversationId,
  onConversationClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const listItemClassName = css`
    font-size: calc(${useEuiFontSize('s').fontSize} - 1px);
    font-weight: ${euiTheme.font.weight.regular};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  return (
    <EuiFlexItem grow={false}>
      <EuiPanel hasBorder={false} hasShadow={false} color="transparent" paddingSize="s">
        <EuiText size="s" className={groupLabelClassName}>
          <h4>{dateLabel}</h4>
        </EuiText>
      </EuiPanel>
      <EuiListGroup flush={false} gutterSize="none" className={fullHeightClassName}>
        {conversations.map((conversation) => (
          <EuiListGroupItem
            key={conversation.id}
            color="text"
            label={
              <EuiText size="s" className={listItemClassName}>
                {conversation.title}
              </EuiText>
            }
            onClick={(event) => onConversationClick(event, conversation.id)}
            size="s"
            isActive={conversation.id === activeConversationId}
            showToolTip
          />
        ))}
      </EuiListGroup>
    </EuiFlexItem>
  );
};

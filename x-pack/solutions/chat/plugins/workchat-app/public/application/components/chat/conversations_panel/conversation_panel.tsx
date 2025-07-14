/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import {
  EuiText,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  useEuiTheme,
  euiScrollBarStyles,
  EuiSpacer,
  EuiIcon,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ConversationSummary } from '../../../../../common/conversations';
import { sortAndGroupConversations } from '../../../utils/sort_and_group_conversations';
import { AssistantBlock } from './assistant_block';
import { ConversationGroup } from './conversation_group';

interface ConversationPanelProps {
  agentId: string;
  conversations: ConversationSummary[];
  activeConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversationSelect?: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  agentId,
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversationSelect,
}) => {
  const handleConversationClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, conversationId: string) => {
      if (onConversationSelect) {
        event.preventDefault();
        onConversationSelect(conversationId);
      }
    },
    [onConversationSelect]
  );

  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);

  const containerClassName = css`
    height: 100%;
    width: 100%;
  `;

  const titleClassName = css`
    text-transform: capitalize;
    font-weight: ${theme.euiTheme.font.weight.bold};
  `;

  const pageSectionContentClassName = css`
    width: 100%;
    display: flex;
    flex-grow: 1;
    height: 100%;
    max-block-size: var(--kbn-application--content-height);
    background-color: ${theme.euiTheme.colors.backgroundBasePlain};
    padding: ${theme.euiTheme.size.base} 0;
  `;

  const sectionBlockPaddingCLassName = css`
    padding: 0 ${theme.euiTheme.size.base};
  `;

  const scrollContainerClassName = css`
    overflow-y: auto;
    padding: 0 ${theme.euiTheme.size.base};
    ${scrollBarStyles}
  `;

  const createButtonRuleClassName = css`
    margin-bottom: ${theme.euiTheme.size.base};
  `;

  const conversationGroups = useMemo(() => {
    return sortAndGroupConversations(conversations);
  }, [conversations]);

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      color="transparent"
      className={pageSectionContentClassName}
    >
      <EuiFlexGroup
        direction="column"
        className={containerClassName}
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem grow={false} className={sectionBlockPaddingCLassName}>
          <AssistantBlock agentId={agentId} />
          <EuiSpacer size="l" />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className={sectionBlockPaddingCLassName}>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="list" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText size="s" className={titleClassName}>
                {i18n.translate('xpack.workchatApp.conversationList.conversationTitle', {
                  defaultMessage: 'Conversations',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow className={scrollContainerClassName}>
          <EuiFlexGroup
            direction="column"
            className={containerClassName}
            gutterSize="none"
            responsive={false}
          >
            {conversationGroups.map(({ conversations: groupConversations, dateLabel }, index) => (
              <>
                <ConversationGroup
                  key={dateLabel}
                  conversations={groupConversations}
                  dateLabel={dateLabel}
                  activeConversationId={activeConversationId}
                  onConversationClick={handleConversationClick}
                />
                {index < conversationGroups.length - 1 && (
                  <EuiSpacer key={dateLabel + '-spacer'} size="m" />
                )}
              </>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule size="full" margin="none" className={createButtonRuleClassName} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className={sectionBlockPaddingCLassName}>
          <EuiButton
            iconType="newChat"
            onClick={() => onNewConversationSelect && onNewConversationSelect()}
          >
            {i18n.translate('xpack.workchatApp.newConversationButtonLabel', {
              defaultMessage: 'New conversation',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

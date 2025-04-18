/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { css } from '@emotion/css';
import {
  EuiPanel,
  EuiText,
  useEuiTheme,
  EuiTabs,
  EuiTab,
  EuiTabbedContentTab,
  useEuiFontSize,
  EuiNotificationBadge,
} from '@elastic/eui';
import type { ConversationRound } from '../../../utils/conversation_rounds';
import { RoundTabAnswer } from './round_tab_answer';
import { RoundTabSources } from './round_tab_sources';

interface ConversationRoundProps {
  round: ConversationRound;
}

export const ChatConversationRound: React.FC<ConversationRoundProps> = ({ round }) => {
  const { euiTheme } = useEuiTheme();

  const { userMessage, loading: isRoundLoading, assistantMessage } = round;

  const rootPanelClass = css`
    margin-bottom: ${euiTheme.size.xl};
  `;

  const tabsContainerClass = css`
    border-bottom: ${euiTheme.border.thin};
    padding: 0 ${euiTheme.size.xxl};
  `;

  const tabContentPanelClass = css`
    padding: ${euiTheme.size.xxl};
  `;

  const userTextContainerClass = css`
    padding: ${euiTheme.size.xxl} ${euiTheme.size.xxl} ${euiTheme.size.xl} ${euiTheme.size.xxl};
  `;

  const userMessageTextClass = css`
    font-weight: ${euiTheme.font.weight.regular};
    font-size: calc(${useEuiFontSize('m').fontSize} + 4px);
  `;

  const [selectedTabId, setSelectedTabId] = useState('answer');

  const tabs = useMemo(() => {
    const tabList: Array<Omit<EuiTabbedContentTab, 'content'>> = [];

    // main answer tab, always present
    tabList.push({
      id: 'answer',
      name: 'Answer',
      append: undefined,
    });

    // sources tab - only when we got sources and message is not loading
    if (!isRoundLoading && assistantMessage?.citations.length) {
      tabList.push({
        id: 'sources',
        name: 'Sources',
        append: (
          <EuiNotificationBadge size="m" color="subdued">
            {assistantMessage!.citations.length}
          </EuiNotificationBadge>
        ),
      });
    }

    return tabList;
  }, [isRoundLoading, assistantMessage]);

  const onSourceClick = useCallback(() => {
    setSelectedTabId('sources');
  }, [setSelectedTabId]);

  const tabContents = useMemo(() => {
    return {
      answer: (
        <RoundTabAnswer
          key={`round-${round.userMessage.id}-answer-tab`}
          round={round}
          onSourceClick={onSourceClick}
        />
      ),
      sources: <RoundTabSources key={`round-${round.userMessage.id}-sources-tab`} round={round} />,
    } as Record<string, React.ReactNode>;
  }, [round, onSourceClick]);

  const selectedTabContent = useMemo(() => {
    return tabContents[selectedTabId];
  }, [tabContents, selectedTabId]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  return (
    <EuiPanel
      className={rootPanelClass}
      borderRadius="none"
      paddingSize="none"
      hasShadow={false}
      hasBorder={true}
    >
      <div className={userTextContainerClass}>
        <EuiText color="subdued" size="m" className={userMessageTextClass}>
          “{userMessage.content}“
        </EuiText>
      </div>

      <div className={tabsContainerClass}>
        <EuiTabs bottomBorder={false}>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              onClick={() => onSelectedTabChanged(tab.id)}
              isSelected={tab.id === selectedTabId}
              append={tab.append}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </div>
      <div className={tabContentPanelClass}>{selectedTabContent}</div>
    </EuiPanel>
  );
};

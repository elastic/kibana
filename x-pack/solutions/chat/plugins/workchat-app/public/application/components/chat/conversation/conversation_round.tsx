/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/css';
import { EuiPanel, EuiText, useEuiTheme, EuiTabs, EuiTab, useEuiFontSize } from '@elastic/eui';
import type { ConversationRound } from '../../../utils/conversation_rounds';
import { RoundTabAnswer } from './round_tab_answer';

interface ConversationRoundProps {
  round: ConversationRound;
}

export const ChatConversationRound: React.FC<ConversationRoundProps> = ({ round }) => {
  const { euiTheme } = useEuiTheme();

  const { userMessage } = round;

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
    return [
      {
        id: 'answer',
        name: 'Answer',
        append: undefined,
      },
    ];
  }, []);

  const tabContents = useMemo(() => {
    return {
      answer: <RoundTabAnswer round={round} />,
    } as Record<string, React.ReactNode>;
  }, [round]);

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ContentRef } from '@kbn/wci-common';
import { css } from '@emotion/css';
import {
  EuiPanel,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiSpacer,
  EuiFlexGrid,
  EuiHorizontalRule,
  EuiIcon,
  EuiTextColor,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { ConversationRound } from '../../../utils/conversation_rounds';
import { ChatMessageText } from './chat_message_text';
import { ChatConversationProgression } from './chat_conversation_progression';

interface RoundTabAnswerProps {
  round: ConversationRound;
  onSourceClick: (ref: ContentRef) => void;
}

export const RoundTabAnswer: React.FC<RoundTabAnswerProps> = ({ round }) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const { assistantMessage, progressionEvents, loading } = round;
  const showSources = !loading && (assistantMessage?.citations.length ?? 0) > 0;

  const subTitlesClass = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <ChatConversationProgression progressionEvents={progressionEvents} />
        <ChatMessageText
          content={assistantMessage?.content ?? ''}
          loading={loading && progressionEvents.length === 0}
        />
      </EuiFlexItem>
      {showSources && (
        <EuiFlexItem>
          <EuiHorizontalRule />
          <EuiText size="xs" className={subTitlesClass}>
            Sources - Most relevant
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid direction="row" columns={isMobile ? 2 : 3}>
            {assistantMessage!.citations.slice(0, 3).map((ref) => (
              <EuiFlexItem>
                <SourceSummary key={`${ref.sourceId}-${ref.contentId}`} contentRef={ref} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

interface SourceSummaryProps {
  contentRef: ContentRef;
}

const SourceSummary: React.FC<SourceSummaryProps> = ({ contentRef }) => {
  const { euiTheme } = useEuiTheme();

  const panelClass = css`
    cursor: pointer;
    border: ${euiTheme.border.thin};

    &:hover {
      border-color: ${euiTheme.colors.borderBaseFormsControl};
    }
  `;

  return (
    <EuiPanel className={panelClass} hasShadow={false} hasBorder={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            justifyContent="flexStart"
            alignItems="center"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="database" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">
                <EuiTextColor color={euiTheme.colors.link}>{contentRef.sourceId}</EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{contentRef.contentId}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

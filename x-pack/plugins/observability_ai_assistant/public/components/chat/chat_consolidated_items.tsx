/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAvatar, EuiButtonIcon, EuiComment, EuiLink } from '@elastic/eui';
import { css } from '@emotion/css';
import { ChatItem } from './chat_item';
import type { ChatTimelineItem, ChatTimelineProps } from './chat_timeline';

const noPanelStyle = css`
  .euiCommentEvent {
    border: none;
  }

  .euiCommentEvent__header {
    background: transparent;
    border-block-end: none;
  }

  .euiCommentEvent__body {
    display: none;
  }

  .euiLink {
    padding: 0 8px;
  }

  .euiLink:focus {
    text-decoration: none;
  }

  .euiLink:hover {
    text-decoration: underline;
  }
`;

const avatarStyle = css`
  cursor: 'pointer';
`;

export function ChatConsolidatedItems({
  consolidatedItem,
  onFeedback,
  onRegenerate,
  onEditSubmit,
  onStopGenerating,
  onActionClick,
}: {
  consolidatedItem: ChatTimelineItem[];
  onFeedback: ChatTimelineProps['onFeedback'];
  onRegenerate: ChatTimelineProps['onRegenerate'];
  onEditSubmit: ChatTimelineProps['onEdit'];
  onStopGenerating: ChatTimelineProps['onStopGenerating'];
  onActionClick: ChatTimelineProps['onActionClick'];
}) {
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <EuiComment
        className={noPanelStyle}
        timelineAvatar={
          <EuiAvatar
            color="subdued"
            css={avatarStyle}
            name="inspect"
            iconType="layers"
            onClick={handleToggleExpand}
          />
        }
        event={
          <EuiLink
            color="subdued"
            data-test-subj="observabilityAiAssistantChatCollapsedItemsCollapsedItemsLink"
            onClick={handleToggleExpand}
          >
            <em>
              {!expanded
                ? i18n.translate('xpack.observabilityAiAssistant.chatCollapsedItems.showEvents', {
                    defaultMessage: 'Show {count} events',
                    values: { count: consolidatedItem.length },
                  })
                : i18n.translate('xpack.observabilityAiAssistant.chatCollapsedItems.hideEvents', {
                    defaultMessage: 'Hide {count} events',
                    values: { count: consolidatedItem.length },
                  })}
            </em>
          </EuiLink>
        }
        username=""
        actions={
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistant.chatCollapsedItems.toggleButtonLabel',
              {
                defaultMessage: 'Show / hide items',
              }
            )}
            color="text"
            data-test-subj="observabilityAiAssistantChatCollapsedItemsButton"
            iconType={expanded ? 'arrowUp' : 'arrowDown'}
            onClick={handleToggleExpand}
          />
        }
      />

      {expanded
        ? consolidatedItem.map((item, index) => (
            <ChatItem
              // use index, not id to prevent unmounting of component when message is persisted
              key={index}
              {...item}
              onFeedbackClick={(feedback) => {
                onFeedback(item.message, feedback);
              }}
              onRegenerateClick={() => {
                onRegenerate(item.message);
              }}
              onEditSubmit={(message) => onEditSubmit(item.message, message)}
              onStopGeneratingClick={onStopGenerating}
              onActionClick={onActionClick}
            />
          ))
        : null}
    </>
  );
}

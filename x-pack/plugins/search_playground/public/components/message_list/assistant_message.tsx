/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import moment from 'moment';

import {
  EuiButtonEmpty,
  EuiComment,
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { RetrievalDocsFlyout } from './retrieval_docs_flyout';
import type { AIMessage as AIMessageType } from '../../types';

import { CopyActionButton } from './copy_action_button';
import { CitationsTable } from './citations_table';
import { TokenEstimateTooltip } from './token_estimate_tooltip';

interface AssistantMessageProps {
  message: Pick<
    AIMessageType,
    'content' | 'createdAt' | 'citations' | 'retrievalDocs' | 'inputTokens'
  >;
}

const AIMessageCSS = css`
  white-space: break-spaces;
`;

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ message }) => {
  const [isDocsFlyoutOpen, setIsDocsFlyoutOpen] = useState(false);
  const { content, createdAt, citations, retrievalDocs, inputTokens } = message;
  const username = i18n.translate('xpack.searchPlayground.chat.message.assistant.username', {
    defaultMessage: 'AI',
  });

  return (
    <>
      {!!retrievalDocs?.length && (
        <EuiComment
          username={username}
          timelineAvatar="dot"
          event={
            <>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.searchPlayground.chat.message.assistant.retrievalDocs"
                    defaultMessage="Grounding answer based on"
                  />
                  {` `}
                </p>
              </EuiText>

              <EuiButtonEmpty
                css={{ blockSize: 'auto' }}
                size="s"
                flush="left"
                onClick={() => setIsDocsFlyoutOpen(true)}
              >
                <FormattedMessage
                  id="xpack.searchPlayground.chat.message.assistant.retrievalDocButton"
                  defaultMessage="{count} document sources"
                  values={{ count: retrievalDocs.length }}
                />
              </EuiButtonEmpty>

              {isDocsFlyoutOpen && (
                <RetrievalDocsFlyout
                  onClose={() => setIsDocsFlyoutOpen(false)}
                  retrievalDocs={retrievalDocs}
                />
              )}
            </>
          }
        />
      )}
      <EuiComment
        username={username}
        event={i18n.translate('xpack.searchPlayground.chat.message.assistant.event.responded', {
          defaultMessage: 'responded',
        })}
        timestamp={
          createdAt &&
          i18n.translate('xpack.searchPlayground.chat.message.assistant.createdAt', {
            defaultMessage: 'at {time}',
            values: {
              time: moment(createdAt).format('HH:mm'),
            },
          })
        }
        timelineAvatar="compute"
        timelineAvatarAriaLabel={i18n.translate(
          'xpack.searchPlayground.chat.message.assistant.avatarAriaLabel',
          {
            defaultMessage: 'AI',
          }
        )}
        actions={
          <>
            <TokenEstimateTooltip context={inputTokens.context} total={inputTokens.total} />
            <CopyActionButton
              copyText={String(content)}
              ariaLabel={i18n.translate('xpack.searchPlayground.chat.message.assistant.copyLabel', {
                defaultMessage: 'Copy assistant message',
              })}
            />
          </>
        }
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.searchPlayground.chat.message.assistant.title"
                defaultMessage="Summary"
              />
            </h4>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText size="s" css={AIMessageCSS}>
          <p>{content}</p>
        </EuiText>
        {!!citations?.length && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xs">
              <p>
                <FormattedMessage
                  id="xpack.searchPlayground.chat.message.assistant.citations.title"
                  defaultMessage="Citations"
                />
              </p>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <CitationsTable citations={citations} />
          </>
        )}
      </EuiComment>
    </>
  );
};

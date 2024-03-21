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
import { RetrievalDocsFlyout } from './retrieval_docs_flyout';
import type { AIMessage as AIMessageType } from '../../types';

import { CopyActionButton } from './copy_action_button';
import { CitationsTable } from './citations_table';

type AssistantMessageProps = Pick<
  AIMessageType,
  'content' | 'createdAt' | 'citations' | 'retrievalDocs'
>;

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  createdAt,
  citations,
  retrievalDocs,
}) => {
  const [isDocsFlyoutOpen, setIsDocsFlyoutOpen] = useState(false);
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
                    defaultMessage="retrieved"
                  />
                </p>
              </EuiText>
              <EuiButtonEmpty
                css={{ blockSize: 'auto' }}
                size="s"
                onClick={() => setIsDocsFlyoutOpen(true)}
              >
                <FormattedMessage
                  id="xpack.searchPlayground.chat.message.assistant.retrievalDocButton"
                  defaultMessage="{count} {count, plural, one {document} other {documents}} sources"
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
            defaultMessage: 'on {date}',
            values: {
              date: moment(createdAt).format('MMM DD, YYYY'),
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
          <CopyActionButton
            copyText={String(content)}
            ariaLabel={i18n.translate('xpack.searchPlayground.chat.message.assistant.copyLabel', {
              defaultMessage: 'Copy assistant message',
            })}
          />
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
        <EuiText size="s">
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

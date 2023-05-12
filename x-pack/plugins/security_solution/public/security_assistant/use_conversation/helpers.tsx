/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import type { QueryType } from '../../timelines/components/timeline/data_providers/data_provider';
import { SendToTimelineButton } from '../send_to_timeline_button';
import type { Conversation } from '../security_assistant_context/types';

export interface CodeBlockDetails {
  type: QueryType;
  content: string;
  start: number;
  end: number;
  controlContainer?: HTMLElement;
  button?: React.FC;
}

/**
 * Returns a list of code block details for each code block in the markdown,
 * including the type of code block and the content of the code block.
 *
 * @param markdown
 */
export const analyzeMarkdown = (markdown: string): CodeBlockDetails[] => {
  const codeBlockRegex = /```(\w+)?\s([\s\S]*?)```/g;
  const matches = [...markdown.matchAll(codeBlockRegex)];
  // If your codeblocks aren't getting tagged with the right language, add keywords to the array.
  const types = {
    eql: ['Event Query Language', 'EQL sequence query'],
    kql: ['Kibana Query Language', 'KQL Query'],
    dsl: ['Elasticsearch QueryDSL', 'Elasticsearch Query DSL', 'Elasticsearch DSL'],
  };

  const result: CodeBlockDetails[] = matches.map((match) => {
    let type = match[1] || 'no-type';
    if (type === 'no-type' || type === 'json') {
      const start = match.index || 0;
      const precedingText = markdown.slice(0, start);
      for (const [typeKey, keywords] of Object.entries(types)) {
        if (keywords.some((kw) => precedingText.includes(kw))) {
          type = typeKey;
          break;
        }
      }
    }

    const content = match[2].trim();
    const start = match.index || 0;
    const end = start + match[0].length;
    return { type: type as QueryType, content, start, end };
  });

  return result;
};

/**
 * Augments the messages in a conversation with code block details, including
 * the start and end indices of the code block in the message, the type of the
 * code block, and the button to add the code block to the timeline.
 *
 * @param currentConversation
 */
export const augmentMessageCodeBlocks = (currentConversation: Conversation) => {
  const cbd = currentConversation.messages.map(({ content }) => {
    return analyzeMarkdown(content);
  });
  return cbd.map((codeBlocks, messageIndex) => {
    return codeBlocks.map((codeBlock, codeBlockIndex) => {
      return {
        ...codeBlock,
        controlContainer: document.querySelectorAll(
          `.message-${messageIndex} .euiCodeBlock__controls`
        )[codeBlockIndex],
        button: (
          <SendToTimelineButton
            asEmptyButton={true}
            dataProviders={[
              {
                id: 'assistant-data-provider',
                name: `Assistant Query from conversation ${currentConversation.id}`,
                enabled: true,
                excluded: false,
                queryType: codeBlock.type,
                kqlQuery: codeBlock.content ?? '',
                queryMatch: {
                  field: 'host.name',
                  operator: ':',
                  value: 'test',
                },
                and: [],
              },
            ]}
            keepDataView={true}
          >
            <EuiToolTip position="right" content={'Add to timeline'}>
              <EuiIcon type="timeline" />
            </EuiToolTip>
          </SendToTimelineButton>
        ),
      };
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeMarkdown } from '@kbn/elastic-assistant';
import type { Conversation, CodeBlockDetails } from '@kbn/elastic-assistant';
import React from 'react';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';

export const LOCAL_STORAGE_KEY = `securityAssistant`;

export interface QueryField {
  field: string;
  values: string;
}

export const getFieldsAsCsv = (queryFields: QueryField[]): string =>
  queryFields.map(({ field, values }) => `${field},${values}`).join('\n');

const sendToTimelineEligibleQueryTypes: Array<CodeBlockDetails['type']> = [
  'kql',
  'dsl',
  'eql',
  'esql',
  'sql', // Models often put the code block language as sql, for esql, so adding this as a fallback
];

/**
 * Augments the messages in a conversation with code block details, including
 * the start and end indices of the code block in the message, the type of the
 * code block, and the button to add the code block to the timeline.
 *
 * @param currentConversation
 */
export const augmentMessageCodeBlocks = (
  currentConversation: Conversation,
  showAnonymizedValues: boolean
): CodeBlockDetails[][] => {
  const cbd = currentConversation.messages.map(({ content }) =>
    analyzeMarkdown(
      showAnonymizedValues
        ? content ?? ''
        : replaceAnonymizedValuesWithOriginalValues({
            messageContent: content ?? '',
            replacements: currentConversation.replacements,
          })
    )
  );

  const output = cbd.map((codeBlocks, messageIndex) =>
    codeBlocks.map((codeBlock, codeBlockIndex) => {
      return {
        ...codeBlock,
        getControlContainer: () =>
          document.querySelectorAll(`.message-${messageIndex} .euiCodeBlock__controls`)[
            codeBlockIndex
          ],
        button: sendToTimelineEligibleQueryTypes.includes(codeBlock.type) ? <></> : null,
      };
    })
  );

  return output;
};

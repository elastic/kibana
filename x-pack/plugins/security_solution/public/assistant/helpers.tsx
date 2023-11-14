/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { analyzeMarkdown } from '@kbn/elastic-assistant';
import type { Conversation, CodeBlockDetails } from '@kbn/elastic-assistant';
import React from 'react';

import type { TimelineEventsDetailsItem } from '../../common/search_strategy';
import type { Rule } from '../detection_engine/rule_management/logic';
import { SendToTimelineButton } from './send_to_timeline';
import { INVESTIGATE_IN_TIMELINE } from '../actions/add_to_timeline/constants';

export const LOCAL_STORAGE_KEY = `securityAssistant`;

export interface QueryField {
  field: string;
  values: string;
}

export const SECURITY_ASSISTANT_UI_SETTING_KEY = 'securityAssistant';

export const getPromptContextFromDetectionRules = (rules: Rule[]): string => {
  const data = rules.map((rule) => `Rule Name:${rule.name}\nRule Description:${rule.description}`);

  return data.join('\n\n');
};

export const getAllFields = (data: TimelineEventsDetailsItem[]): QueryField[] =>
  data
    .filter(({ field }) => !field.startsWith('signal.'))
    .map(({ field, values }) => ({ field, values: values?.join(',') ?? '' }));

export const getRawData = (data: TimelineEventsDetailsItem[]): Record<string, string[]> =>
  data
    .filter(({ field }) => !field.startsWith('signal.'))
    .reduce((acc, { field, values }) => ({ ...acc, [field]: values ?? [] }), {});

export const getFieldsAsCsv = (queryFields: QueryField[]): string =>
  queryFields.map(({ field, values }) => `${field},${values}`).join('\n');

export const getPromptContextFromEventDetailsItem = (data: TimelineEventsDetailsItem[]): string => {
  const allFields = getAllFields(data);

  return getFieldsAsCsv(allFields);
};

const sendToTimelineEligibleQueryTypes: Array<CodeBlockDetails['type']> = [
  'kql',
  'dsl',
  'eql',
  'esql',
  'sql', // Models often put the code block language as sql, for esql, so adding this as a fallback
];

/**
 * Returns message contents with replacements applied.
 *
 * @param message
 * @param replacements
 */
export const getMessageContentWithReplacements = ({
  messageContent,
  replacements,
}: {
  messageContent: string;
  replacements: Record<string, string> | undefined;
}): string =>
  replacements != null
    ? Object.keys(replacements).reduce(
        (acc, replacement) => acc.replaceAll(replacement, replacements[replacement]),
        messageContent
      )
    : messageContent;

/**
 * Augments the messages in a conversation with code block details, including
 * the start and end indices of the code block in the message, the type of the
 * code block, and the button to add the code block to the timeline.
 *
 * @param currentConversation
 */
export const augmentMessageCodeBlocks = (
  currentConversation: Conversation
): CodeBlockDetails[][] => {
  const cbd = currentConversation.messages.map(({ content }) =>
    analyzeMarkdown(
      getMessageContentWithReplacements({
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
        button: sendToTimelineEligibleQueryTypes.includes(codeBlock.type) ? (
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
            <EuiToolTip position="right" content={INVESTIGATE_IN_TIMELINE}>
              <EuiIcon type="timeline" />
            </EuiToolTip>
          </SendToTimelineButton>
        ) : null,
      };
    })
  );

  return output;
};

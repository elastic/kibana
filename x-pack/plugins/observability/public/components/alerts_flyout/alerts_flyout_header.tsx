/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { NewChat } from '@kbn/elastic-assistant';
import type { TopAlert } from '../../typings/alerts';
import {
  ALERT_CONTEXT_DESCRIPTION,
  ALERT_SUMMARIZATION_PROMPT,
  ALERT_SUMMARY_CONVERSATION_ID,
} from '../../assistant/translations';
import { PROMPT_CONTEXT_ALERT_CATEGORY } from '../../assistant/conversations';

interface FlyoutProps {
  alert: TopAlert;
  id?: string;
}

export function AlertsFlyoutHeader({ alert }: FlyoutProps) {
  // Elastic Assistant Prompt Context Data Provider for Event fields
  const getPromptContext = useCallback(
    async () =>
      Object.entries(alert.fields)
        .map((k) => {
          return k;
        })
        .join('\n'),
    [alert]
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="m" data-test-subj="alertsFlyoutTitle">
        <h2>
          {alert.fields[ALERT_RULE_NAME]}{' '}
          <NewChat
            category={PROMPT_CONTEXT_ALERT_CATEGORY}
            conversationId={ALERT_SUMMARY_CONVERSATION_ID}
            description={ALERT_CONTEXT_DESCRIPTION}
            getPromptContext={getPromptContext}
            iconType={null}
            suggestedUserPrompt={ALERT_SUMMARIZATION_PROMPT}
            tooltip={null}
          >
            {'🪄✨'}
          </NewChat>
        </h2>
      </EuiTitle>
    </>
  );
}

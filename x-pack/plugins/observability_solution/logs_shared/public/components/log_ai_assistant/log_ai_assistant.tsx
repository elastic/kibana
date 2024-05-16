/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  Message,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { LogEntryField } from '../../../common';
import { explainLogMessageTitle, similarLogMessagesTitle } from './translations';

export interface LogAIAssistantDocument {
  fields: LogEntryField[];
}

export interface LogAIAssistantProps {
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  doc: LogAIAssistantDocument | undefined;
}

export const LogAIAssistant = ({
  doc,
  observabilityAIAssistant: {
    ObservabilityAIAssistantContextualInsight,
    getContextualInsightMessages,
  },
}: LogAIAssistantProps) => {
  const explainLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!doc) {
      return undefined;
    }

    return getContextualInsightMessages({
      message:
        'Can you explain what this log message means? Where it could be coming from, whether it is expected and whether it is an issue.',
      instructions: JSON.stringify({
        logEntry: {
          fields: doc.fields,
        },
      }),
    });
  }, [doc, getContextualInsightMessages]);

  const similarLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!doc) {
      return undefined;
    }

    const messageValue = doc.fields.find((field) => field.field === 'message')?.value;
    const message = Array.isArray(messageValue) ? messageValue[0] : messageValue;

    return getContextualInsightMessages({
      message: `I'm looking at a log entry. Can you construct a Kibana KQL query that I can enter in the search bar that gives me similar log entries, based on the message field?`,
      instructions: JSON.stringify({
        message,
      }),
    });
  }, [getContextualInsightMessages, doc]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {ObservabilityAIAssistantContextualInsight && explainLogMessageMessages ? (
        <EuiFlexItem grow={false}>
          <ObservabilityAIAssistantContextualInsight
            title={explainLogMessageTitle}
            messages={explainLogMessageMessages}
            dataTestSubj="obsAiAssistantInsightButtonExplainLogMessage"
          />
        </EuiFlexItem>
      ) : null}
      {ObservabilityAIAssistantContextualInsight && similarLogMessageMessages ? (
        <EuiFlexItem grow={false}>
          <ObservabilityAIAssistantContextualInsight
            title={similarLogMessagesTitle}
            messages={similarLogMessageMessages}
            dataTestSubj="obsAiAssistantInsightButtonSimilarLogMessage"
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogAIAssistant;

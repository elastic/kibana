/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  ContextualInsight,
  type Message,
  ObservabilityAIAssistantPluginStart,
  MessageRole,
  ObservabilityAIAssistantProvider,
  useObservabilityAIAssistant,
} from '@kbn/observability-ai-assistant-plugin/public';
import { LogEntryField } from '../../../common';
import { explainLogMessageTitle, similarLogMessagesTitle } from './translations';

export interface LogAIAssistantDocument {
  fields: LogEntryField[];
}

export interface LogAIAssistantProps {
  doc: LogAIAssistantDocument | undefined;
}

export interface LogAIAssistantDeps extends LogAIAssistantProps {
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
}

export const LogAIAssistant = withProviders(({ doc }: LogAIAssistantProps) => {
  const aiAssistant = useObservabilityAIAssistant();

  const explainLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!doc) {
      return undefined;
    }

    const now = new Date().toISOString();

    return [
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: `I'm looking at a log entry. Can you explain me what the log message means? Where it could be coming from, whether it is expected and whether it is an issue. Here's the context, serialized: ${JSON.stringify(
            { logEntry: { fields: doc.fields } }
          )} `,
        },
      },
    ];
  }, [doc]);

  const similarLogMessageMessages = useMemo<Message[] | undefined>(() => {
    if (!doc) {
      return undefined;
    }

    const now = new Date().toISOString();

    const message = doc.fields.find((field) => field.field === 'message')?.value[0];

    return [
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: `I'm looking at a log entry. Can you construct a Kibana KQL query that I can enter in the search bar that gives me similar log entries, based on the \`message\` field: ${message}`,
        },
      },
    ];
  }, [doc]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {aiAssistant.isEnabled() && explainLogMessageMessages ? (
        <EuiFlexItem grow={false}>
          <ContextualInsight title={explainLogMessageTitle} messages={explainLogMessageMessages} />
        </EuiFlexItem>
      ) : null}
      {aiAssistant.isEnabled() && similarLogMessageMessages ? (
        <EuiFlexItem grow={false}>
          <ContextualInsight title={similarLogMessagesTitle} messages={similarLogMessageMessages} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
});

// eslint-disable-next-line import/no-default-export
export default LogAIAssistant;

function withProviders(Component: React.FunctionComponent<LogAIAssistantProps>) {
  return function ComponentWithProviders({
    observabilityAIAssistant,
    ...props
  }: LogAIAssistantDeps) {
    return (
      <ObservabilityAIAssistantProvider value={observabilityAIAssistant}>
        <Component {...props} />
      </ObservabilityAIAssistantProvider>
    );
  };
}

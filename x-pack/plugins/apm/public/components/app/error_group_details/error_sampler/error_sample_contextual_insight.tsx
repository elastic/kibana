/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useObservabilityAIAssistant,
  ContextualInsight,
  type Message,
  MessageRole,
} from '@kbn/observability-ai-assistant-plugin/public';
import React, { useMemo, useState } from 'react';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { ErrorSampleDetailTabContent } from './error_sample_detail';
import { exceptionStacktraceTab, logStacktraceTab } from './error_tabs';

export function ErrorSampleContextualInsight({
  error,
  transaction,
}: {
  error: APMError;
  transaction?: Transaction;
}) {
  const aiAssistant = useObservabilityAIAssistant();

  const [logStacktrace, setLogStacktrace] = useState('');
  const [exceptionStacktrace, setExceptionStacktrace] = useState('');

  const messages = useMemo<Message[]>(() => {
    const now = new Date().toISOString();

    const serviceName = error.service.name;
    const languageName = error.service.language?.name ?? '';
    const runtimeName = error.service.runtime?.name ?? '';
    const runtimeVersion = error.service.runtime?.version ?? '';
    const transactionName = transaction?.transaction.name ?? '';

    return [
      {
        '@timestamp': now,
        message: {
          role: MessageRole.System,
          content: `You are apm-gpt, a helpful assistant for performance analysis, optimisation and
          root cause analysis of software. Answer as concisely as possible.`,
        },
      },
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: `I'm an SRE. I am looking at an exception and trying to understand what it means.

Your task is to describe what the error means and what it could be caused by.

The error occurred on a service called ${serviceName}, which is a ${runtimeName} service written in ${languageName}. The
runtime version is ${runtimeVersion}.

The request it occurred for is called ${transactionName}.

${
  logStacktrace
    ? `The log stacktrace:
${logStacktrace}`
    : ''
}

${
  exceptionStacktrace
    ? `The exception stacktrace:
${exceptionStacktrace}`
    : ''
}
`,
        },
      },
    ];
  }, [error, transaction, logStacktrace, exceptionStacktrace]);

  return aiAssistant.isEnabled() && messages ? (
    <>
      <EuiFlexItem>
        <ContextualInsight
          messages={messages}
          title={i18n.translate(
            'xpack.apm.errorGroupContextualInsight.explainErrorTitle',
            { defaultMessage: "What's this error?" }
          )}
        />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <div
        ref={(next) => {
          setLogStacktrace(next?.innerText ?? '');
        }}
        style={{ display: 'none' }}
      >
        {error.error.log?.message && (
          <ErrorSampleDetailTabContent
            error={error}
            currentTab={logStacktraceTab}
          />
        )}
      </div>
      <div
        ref={(next) => {
          setExceptionStacktrace(next?.innerText ?? '');
        }}
        style={{ display: 'none' }}
      >
        {error.error.exception?.length && (
          <ErrorSampleDetailTabContent
            error={error}
            currentTab={exceptionStacktraceTab}
          />
        )}
      </div>
    </>
  ) : (
    <></>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { EuiButton, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { AT_TIMESTAMP } from '@kbn/apm-types';
import type { Message } from '@kbn/observability-ai-assistant-plugin/public';
// import { OBSERVABILITY_AGENT_ID } from '../../../../../common/observability_agent/agent_id';
import { OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID } from '../../../../../common/observability_agent/attachment_ids';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { getIsObservabilityAgentEnabled } from '../../../../../common/observability_agent/get_is_obs_agent_enabled';
import { ErrorSampleDetailTabContent } from './error_sample_detail';
import { exceptionStacktraceTab, logStacktraceTab } from './error_tabs';

export function ErrorSampleContextualInsight({
  error,
  transaction,
}: {
  error: {
    [AT_TIMESTAMP]: string;
    error: Pick<APMError['error'], 'log' | 'exception' | 'id'>;
    service: {
      name: string;
      environment?: string;
      language?: {
        name?: string;
      };
      runtime?: {
        name?: string;
        version?: string;
      };
    };
  };
  transaction?: {
    transaction: {
      name: string;
    };
  };
}) {
  const { observabilityAIAssistant, onechat, core } = useApmPluginContext();
  const isObservabilityAgentEnabled = getIsObservabilityAgentEnabled(core);

  const [logStacktrace, setLogStacktrace] = useState('');
  const [exceptionStacktrace, setExceptionStacktrace] = useState('');

  const messages = useMemo<Message[] | undefined>(() => {
    if (onechat && isObservabilityAgentEnabled) {
      return undefined;
    }

    const serviceName = error.service.name;
    const languageName = error.service.language?.name ?? '';
    const runtimeName = error.service.runtime?.name ?? '';
    const runtimeVersion = error.service.runtime?.version ?? '';
    const transactionName = transaction?.transaction.name ?? '';

    return observabilityAIAssistant?.getContextualInsightMessages({
      message: `I'm looking at an exception and trying to understand what it means`,
      instructions: `I'm an SRE. I am looking at an exception and trying to understand what it means.

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
      }`,
    });
  }, [
    error,
    transaction,
    logStacktrace,
    exceptionStacktrace,
    observabilityAIAssistant,
    onechat,
    isObservabilityAgentEnabled,
  ]);

  const attachments = useMemo(() => {
    if (!onechat || !isObservabilityAgentEnabled) {
      return [];
    }

    const serviceName = error.service.name;
    const languageName = error.service.language?.name ?? '';
    const runtimeName = error.service.runtime?.name ?? '';
    const runtimeVersion = error.service.runtime?.version ?? '';
    const transactionName = transaction?.transaction.name ?? '';

    return [
      {
        id: 'apm_error_details_screen_context',
        type: 'screen_context',
        getContent: () => ({
          app: 'apm',
          url: window.location.href,
          description: `APM error details page for ${serviceName}`,
        }),
      },
      {
        id: 'apm_error_details_instructions',
        type: 'text',
        getContent: () => ({
          content: dedent(`
            <contextual_instructions>
              I'm an SRE. I am looking at an exception in the Kibana APM UI and trying to understand what it means.
              Your task is to describe what the error means and what it could be caused by. Using **ONLY** the provided data produce a concise, action-oriented response.
              
              Only call tools if the attachments do not contain the necessary data to analyze the error.
              Prefer using attachment data if possible and only call tools to fetch any missing context (e.g., grouping key, trace, transaction, span, downstream dependencies) when required.
              **DO NOT** call any tools before providing your first response as all the error details are provided in the attachments.
            
              Respond using the following structure:
              - Summary: One paragraph explaining what the error means and likely causes.
              - Failure pinpoint: Identify whether this is application code or a dependency (e.g., network/HTTP), and name the failing component/endpoint if clear. Cite specific fields or key stack frames (function:file:line) that support your reasoning.
              - Impact: Scope and severity (Reference endpoint(s)/service and time window if evident)
              - Immediate actions: Ordered checklist of concrete steps to remediate or validate (e.g., config/network checks, retries/backoff, circuit breakers).
              - Open questions and required data (if any): Explicit gaps and the quickest queries/tools to fill them.

              Response format:
              - Prefer Markdown. Use short headings and bullet points. Include brief code blocks only if essential.
              
              Keep the answer practical and concise. Avoid repeating raw stacktraces; reference only key frames.
            </contextual_instructions>`),
        }),
      },
      {
        id: 'apm_error_details_error_attachment',
        type: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
        getContent: () => ({
          service: {
            name: serviceName,
            environment: error.service.environment,
            language: languageName,
            runtime_name: runtimeName,
            runtime_version: runtimeVersion,
          },
          transaction_name: transactionName,
          error_id: error.error.id,
          occurred_at: error['@timestamp'],
          log_stacktrace: logStacktrace,
          exception_stacktrace: exceptionStacktrace,
        }),
      },
    ];
  }, [
    error,
    transaction,
    logStacktrace,
    exceptionStacktrace,
    onechat,
    isObservabilityAgentEnabled,
  ]);

  if (onechat && isObservabilityAgentEnabled) {
    return (
      <>
        <EuiSpacer size="s" />
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="apmErrorContextualInsightExplainThisErrorButton"
            iconType="sparkles"
            onClick={() => {
              onechat.openConversationFlyout({
                initialMessage: i18n.translate(
                  'xpack.apm.errorGroupContextualInsight.agentBuilderFlyoutInitialMessage',
                  {
                    defaultMessage:
                      "I'm looking at an exception and trying to understand what it means",
                  }
                ),
                attachments,
                sessionTag: 'apm-error-context',
                newConversation: true,
                // agentId: OBSERVABILITY_AGENT_ID,
              });
            }}
          >
            {i18n.translate('xpack.apm.errorGroupContextualInsight.explainButtonLabel', {
              defaultMessage: 'Explain this error',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <div
          ref={(next) => {
            setLogStacktrace(next?.innerText ?? '');
          }}
          style={{ display: 'none' }}
        >
          {error.error.log?.message && (
            <ErrorSampleDetailTabContent error={error} currentTab={logStacktraceTab} />
          )}
        </div>
        <div
          ref={(next) => {
            setExceptionStacktrace(next?.innerText ?? '');
          }}
          style={{ display: 'none' }}
        >
          {error.error.exception?.length && (
            <ErrorSampleDetailTabContent error={error} currentTab={exceptionStacktraceTab} />
          )}
        </div>
      </>
    );
  }

  return observabilityAIAssistant?.ObservabilityAIAssistantContextualInsight && messages ? (
    <>
      <EuiFlexItem>
        <observabilityAIAssistant.ObservabilityAIAssistantContextualInsight
          messages={messages}
          title={i18n.translate('xpack.apm.errorGroupContextualInsight.explainErrorTitle', {
            defaultMessage: "What's this error?",
          })}
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
          <ErrorSampleDetailTabContent error={error} currentTab={logStacktraceTab} />
        )}
      </div>
      <div
        ref={(next) => {
          setExceptionStacktrace(next?.innerText ?? '');
        }}
        style={{ display: 'none' }}
      >
        {error.error.exception?.length && (
          <ErrorSampleDetailTabContent error={error} currentTab={exceptionStacktraceTab} />
        )}
      </div>
    </>
  ) : (
    <></>
  );
}

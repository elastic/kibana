/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { AT_TIMESTAMP } from '@kbn/apm-types';
import { ContextualInsight } from '@kbn/ai-agent';
import { OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID } from '../../../../../common/observability_agent/attachment_ids';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { getIsObservabilityAgentEnabled } from '../../../../../common/observability_agent/get_is_obs_agent_enabled';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useLocalStorage } from '../../../../hooks/use_local_storage';
import { ErrorSampleDetailTabContent } from './error_sample_detail';
import { exceptionStacktraceTab, logStacktraceTab } from './error_tabs';

export function ErrorSampleAiAgentContextualInsight({
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
  const { onechat, core, inference } = useApmPluginContext();
  const isObservabilityAgentEnabled = getIsObservabilityAgentEnabled(core);

  const [logStacktrace, setLogStacktrace] = useState('');
  const [exceptionStacktrace, setExceptionStacktrace] = useState('');

  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}'
  );
  const { rangeFrom, rangeTo, environment, kuery } = query;
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [isLoading, setIsLoading] = useState(false);
  const [llmResponse, setLlmResponse] = useState<{ content: string } | undefined>(undefined);
  const [lastUsedConnectorId] = useLocalStorage('agentBuilder.lastUsedConnector', '');

  const fetchContextualInsights = async () => {
    // if (!onechat || !isObservabilityAgentEnabled || !start || !end || !error?.error?.id) {
    //   return;
    // }
    // // avoid re-fetch if content is already loaded
    // // we can change to fetch always if needed
    // if (llmContent || isLoading) {
    //   return;
    // }

    setIsLoading(true);
    try {
      const response = await callApmApi('POST /internal/apm/ai_agent/contextual_insights/error', {
        params: {
          body: {
            serviceName: error.service.name,
            errorId: error.error.id,
            start,
            end,
            environment,
            kuery,
            connectorId: lastUsedConnectorId,
          },
        },
      });

      setLlmResponse(response?.llmResponse);
    } catch (e) {
      setLlmResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

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
      // {
      //   id: 'apm_error_details_instructions',
      //   type: 'text',
      //   getContent: () => ({
      //     content: dedent(`
      //       <contextual_instructions>
      //         I'm an SRE. I am looking at an exception in the Kibana APM UI and trying to understand what it means.
      //         Your task is to describe what the error means and what it could be caused by. Using **ONLY** the provided data produce a concise, action-oriented response.

      //         Only call tools if the attachments do not contain the necessary data to analyze the error.
      //         Prefer using attachment data if possible and only call tools to fetch any missing context (e.g., grouping key, trace, transaction, span, downstream dependencies) when required.
      //         **DO NOT** call any tools before providing your first response as all the error details are provided in the attachments.

      //         Respond using the following structure:
      //         - Summary: One paragraph explaining what the error means and likely causes.
      //         - Failure pinpoint: Identify whether this is application code or a dependency (e.g., network/HTTP), and name the failing component/endpoint if clear. Cite specific fields or key stack frames (function:file:line) that support your reasoning.
      //         - Impact: Scope and severity (Reference endpoint(s)/service and time window if evident)
      //         - Immediate actions: Ordered checklist of concrete steps to remediate or validate (e.g., config/network checks, retries/backoff, circuit breakers).
      //         - Open questions and required data (if any): Explicit gaps and the quickest queries/tools to fill them.

      //         Response format:
      //         - Prefer Markdown. Use short headings and bullet points. Include brief code blocks only if essential.

      //         Keep the answer practical and concise. Avoid repeating raw stacktraces; reference only key frames.
      //       </contextual_instructions>`),
      //   }),
      // },
      {
        id: 'apm_error_details_instructions',
        type: 'text',
        getContent: () => ({
          content: dedent(`
            <contextual_instructions>
              Only call tools if the attachments do not contain the necessary data to analyze the error.
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
      ...(llmResponse?.content
        ? [
            {
              id: 'apm_error_details_llm_summary',
              type: 'text',
              getContent: () => ({
                content: llmResponse.content,
              }),
            },
          ]
        : []),
    ];
  }, [
    error,
    transaction,
    logStacktrace,
    exceptionStacktrace,
    onechat,
    isObservabilityAgentEnabled,
    llmResponse,
  ]);

  if (!onechat || !isObservabilityAgentEnabled || !inference) {
    return <></>;
  }

  return (
    <>
      <ContextualInsight
        title={i18n.translate('xpack.apm.errorGroupContextualInsight.explainErrorTitle', {
          defaultMessage: "What's this error?",
        })}
        description={i18n.translate(
          'xpack.apm.errorGroupContextualInsight.explainErrorDescription',
          {
            defaultMessage: 'Get helpful insights from our Elastic AI Agent',
          }
        )}
        content={llmResponse?.content ?? ''}
        isLoading={isLoading}
        onOpen={fetchContextualInsights}
        onStartConversation={() => {
          onechat.openConversationFlyout({
            attachments,
            sessionTag: 'apm-error-context',
            newConversation: true,
          });
        }}
      />
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

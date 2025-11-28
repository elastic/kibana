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
import { AiInsight } from '@kbn/observability-agent-builder';
import { OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID } from '../../../../../common/agent_builder/attachment_ids';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { getIsObservabilityAgentEnabled } from '../../../../../common/agent_builder/get_is_obs_agent_enabled';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { useLocalStorage } from '../../../../hooks/use_local_storage';

export function ErrorSampleAgentBuilderAiInsight({
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

  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}'
  );
  const { rangeFrom, rangeTo, environment, kuery } = query;
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');

  const [lastUsedConnectorId] = useLocalStorage('agentBuilder.lastUsedConnector', '');

  const fetchAiInsights = async () => {
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
      const response = await callApmApi('POST /internal/apm/agent_builder/ai_insights/error', {
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
        signal: null,
      });

      setSummary(response?.summary ?? '');
      setContext(response?.context);
    } catch (e) {
      setSummary('');
      setContext('');
    } finally {
      setIsLoading(false);
    }
  };

  const attachments = useMemo(() => {
    if (!onechat || !isObservabilityAgentEnabled) {
      return [];
    }

    const serviceName = error.service.name;
    // context and summary now come from the API response

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
      // TODO: move this to the server-side
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
            <ai_insight_instructions>
              Only call tools if the attachments do not contain the necessary data to analyze the error.
            </ai_insight_instructions>`),
        }),
      },
      {
        id: 'apm_error_ai_insight',
        type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
        getContent: () => ({
          summary,
          context,
        }),
      },
    ];
  }, [error, onechat, isObservabilityAgentEnabled, summary, context]);

  if (!onechat || !isObservabilityAgentEnabled || !inference) {
    return <></>;
  }

  return (
    <>
      <AiInsight
        title={i18n.translate('xpack.apm.errorGroupAiInsight.explainErrorTitle', {
          defaultMessage: "What's this error?",
        })}
        description={i18n.translate('xpack.apm.errorGroupAiInsight.explainErrorDescription', {
          defaultMessage: 'Get helpful insights from our Elastic AI Agent',
        })}
        content={summary}
        isLoading={isLoading}
        onOpen={fetchAiInsights}
        onStartConversation={() => {
          onechat.openConversationFlyout({
            attachments,
            sessionTag: 'apm-error-ai-insight',
            newConversation: true,
          });
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
}

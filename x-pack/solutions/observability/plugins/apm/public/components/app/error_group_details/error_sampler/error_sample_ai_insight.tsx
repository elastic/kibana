/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AiInsight } from '@kbn/ai-insights';
import {
  createRepositoryClient,
  type DefaultClientOptions,
} from '@kbn/server-route-repository-client';
import type { ObservabilityAgentBuilderServerRouteRepository } from '@kbn/observability-agent-builder-plugin/server';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
} from '@kbn/observability-agent-builder-plugin/public';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type ErrorSampleDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}'>;

export function ErrorSampleAiInsight({ error }: Pick<ErrorSampleDetails, 'error'>) {
  const { onechat, core } = useApmPluginContext();

  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  const observabilityAgentBuilderApiClient = createRepositoryClient<
    ObservabilityAgentBuilderServerRouteRepository,
    DefaultClientOptions
  >(core);

  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}'
  );
  const { rangeFrom, rangeTo, environment } = query;
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [isLoading, setIsLoading] = useState(false);
  const [aiInsightError, setAiInsightError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');

  const license = useLicenseContext();

  const errorId = error.error.id;
  const serviceName = error.service.name;

  const fetchAiInsights = async () => {
    setIsLoading(true);
    setAiInsightError(undefined);
    try {
      const response = await observabilityAgentBuilderApiClient.fetch(
        'POST /internal/observability_agent_builder/ai_insights/error',
        {
          signal: null,
          params: {
            body: {
              errorId,
              serviceName,
              start,
              end,
              environment,
            },
          },
        }
      );

      setSummary(response?.summary ?? '');
      setContext(response?.context ?? '');
    } catch (e) {
      setAiInsightError(e instanceof Error ? e.message : 'Failed to load AI insight');
    } finally {
      setIsLoading(false);
    }
  };

  const onStartConversation = () => {
    if (!onechat?.openConversationFlyout) return;

    onechat.openConversationFlyout({
      newConversation: true,
      attachments: [
        {
          type: 'screen_context',
          data: {
            app: 'apm',
            url: window.location.href,
            description: `APM error details page for error ID ${errorId} on service ${serviceName}`,
          },
          hidden: true,
        },
        {
          type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
          data: {
            summary,
            context,
          },
        },
        {
          type: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
          data: {
            errorId,
            serviceName,
            environment,
            start,
            end,
          },
        },
      ],
    });
  };

  if (!onechat || !isAgentChatExperienceEnabled) {
    return null;
  }

  return (
    <>
      <AiInsight
        title={i18n.translate('xpack.apm.errorAiInsight.titleLabel', {
          defaultMessage: "What's this error?",
        })}
        description={i18n.translate('xpack.apm.errorAiInsight.descriptionLabel', {
          defaultMessage: 'Get helpful insights from our Elastic AI Agent',
        })}
        license={license}
        content={summary}
        isLoading={isLoading}
        error={aiInsightError}
        onOpen={fetchAiInsights}
        onStartConversation={onStartConversation}
      />
      <EuiSpacer size="s" />
    </>
  );
}

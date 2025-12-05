/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AiInsight } from '@kbn/observability-agent-builder';
import { useConnectorSelection } from '@kbn/onechat-plugin/public';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
} from '../../../../../common/agent_builder/attachment_ids';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getIsObservabilityAgentEnabled } from '../../../../../common/agent_builder/get_is_obs_agent_enabled';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

export function ErrorSampleAgentBuilderAiInsight({
  error,
  transaction,
}: APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}'>) {
  const { onechat, core } = useApmPluginContext();
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

  const { selectedConnector, defaultConnectorId } = useConnectorSelection();

  const errorId = error.error.id;
  const serviceName = error.service.name;

  const fetchAiInsights = async () => {
    setIsLoading(true);
    try {
      const response = await core.http.post<{ summary: string; context: string }>(
        '/internal/observability_agent_builder/ai_insights/error',
        {
          body: JSON.stringify({
            serviceName: error.service.name,
            errorId: error.error.id,
            start,
            end,
            environment,
            kuery,
            connectorId: selectedConnector ?? defaultConnectorId ?? '',
          }),
        }
      );

      setSummary(response?.summary ?? '');
      setContext(response?.context ?? '');
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

    return [
      {
        id: 'apm_error_details_screen_context_attachment',
        type: 'screen_context',
        data: {
          app: 'apm',
          url: window.location.href,
          description: `APM error details page for error ID ${errorId} on service ${serviceName}`,
        },
        hidden: true,
      },
      {
        id: 'apm_error_details_ai_insight_attachment',
        type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
        data: {
          summary,
          context,
        },
      },
      {
        id: 'apm_error_details_error_attachment',
        type: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
        data: {
          errorId,
          serviceName,
          environment,
          start,
          end,
        },
      },
    ];
  }, [
    onechat,
    isObservabilityAgentEnabled,
    errorId,
    serviceName,
    summary,
    context,
    environment,
    start,
    end,
  ]);

  if (!onechat || !isObservabilityAgentEnabled) {
    return <></>;
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
        content={summary}
        isLoading={isLoading}
        onOpen={fetchAiInsights}
        onStartConversation={() => {
          onechat.openConversationFlyout({
            attachments,
            sessionTag: 'observability',
            newConversation: true,
          });
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
}

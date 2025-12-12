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
import {
  createRepositoryClient,
  type DefaultClientOptions,
} from '@kbn/server-route-repository-client';
import type { ObservabilityAgentBuilderServerRouteRepository } from '@kbn/observability-agent-builder-plugin/server';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
} from '@kbn/observability-agent-builder-plugin/common';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getIsObservabilityAgentEnabled } from '../../../../../common/agent_builder/get_is_obs_agent_enabled';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type ErrorSampleDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}'>;

export function ErrorSampleAiInsight({ error }: Pick<ErrorSampleDetails, 'error'>) {
  const { onechat, core } = useApmPluginContext();
  const isObservabilityAgentEnabled = getIsObservabilityAgentEnabled(core);

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
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');

  const license = useLicenseContext();
  const hasEnterpriseLicense = license?.hasAtLeast('enterprise') ?? false;

  const errorId = error.error.id;
  const serviceName = error.service.name;

  const fetchAiInsights = async () => {
    setIsLoading(true);
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
      setSummary('');
      setContext('');
    } finally {
      setIsLoading(false);
    }
  };

  const attachments = useMemo(() => {
    if (!onechat || !isObservabilityAgentEnabled || !hasEnterpriseLicense) {
      return [];
    }

    return [
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
    ];
  }, [
    onechat,
    isObservabilityAgentEnabled,
    hasEnterpriseLicense,
    errorId,
    serviceName,
    summary,
    context,
    environment,
    start,
    end,
  ]);

  if (!onechat || !isObservabilityAgentEnabled || !hasEnterpriseLicense) {
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
            newConversation: true,
          });
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
}

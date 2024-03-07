/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  createFunctionRequestMessage,
  createFunctionResponseMessage,
} from '@kbn/observability-ai-assistant-plugin/public';
import React, { useCallback } from 'react';
import dedent from 'dedent';

import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { useKibana } from '../../../../context/kibana_context/use_kibana';
import { AlertDetailsAppSectionProps } from './types';

export function AlertDetailContextualInsights({
  alert,
}: {
  alert: AlertDetailsAppSectionProps['alert'];
}) {
  const {
    services: {
      observabilityAIAssistant: { ObservabilityAIAssistantContextualInsight },
    },
  } = useKibana();

  const getPromptMessages = useCallback(async () => {
    const { start, end } = getConversationTimeRange(alert);

    const {
      apmTimeseries,
      downstreamDependencies,
      logCategories,
      serviceList,
      serviceSummary,
    } = await callApmApi(
      'GET /internal/apm/assistant/get_apm_alert_details_context',
      {
        signal: null,
        params: {
          query: {
            [SERVICE_NAME]: alert.fields[SERVICE_NAME],
            [SERVICE_ENVIRONMENT]: alert.fields[SERVICE_ENVIRONMENT],
            [TRANSACTION_TYPE]: alert.fields[TRANSACTION_TYPE],
            [TRANSACTION_NAME]: alert.fields[TRANSACTION_NAME],
            end,
            start,
          },
        },
      }
    );

    const serviceName = alert.fields[SERVICE_NAME];

    return [
      createFunctionRequestMessage({
        name: 'get_apm_alert_details_context',
        args: {
          [SERVICE_NAME]: alert.fields[SERVICE_NAME],
          [SERVICE_ENVIRONMENT]: alert.fields[SERVICE_ENVIRONMENT],
          [TRANSACTION_TYPE]: alert.fields[TRANSACTION_TYPE],
          [TRANSACTION_NAME]: alert.fields[TRANSACTION_NAME],
        },
      }).message,

      createFunctionResponseMessage({
        name: 'get_apm_alert_details_context',
        content: dedent(
          `Summary for the service where the alert occurred. Use this as background. DO NOT repeat this information to the user. 
          ${JSON.stringify(serviceSummary)}
          
          Services reporting to this cluster. These may or may not be connected to "${serviceName}":
          ${JSON.stringify(serviceList)}
    
          Downstream dependencies from the service "${serviceName}". Problems in these services can negatively affect the performance of "${serviceName}":
          ${JSON.stringify(downstreamDependencies)}
    
          Timeseries and change points for the service "${serviceName}". Use this to spot significant changes likes dips in throughput or spikes in latency:
          ${JSON.stringify(apmTimeseries)}
    
          Log categories occurring around the time of the alert. Use this to find significant events that may be related to the alert.
          ${JSON.stringify(logCategories)}
  
          Help the user understand the root cause of the alert. Please look for correlations between logs and time series change points. Suggest actions the user should take to investigate further.
          `
        ),
      }).message,
    ];
  }, [alert]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {ObservabilityAIAssistantContextualInsight ? (
        <EuiFlexItem grow={false}>
          <ObservabilityAIAssistantContextualInsight
            title={'Help me understand this alert'}
            messages={getPromptMessages}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

export function getConversationTimeRange(
  alert: AlertDetailsAppSectionProps['alert']
) {
  const padding = 5 * 60 * 1000; // 5 minutes
  const start = new Date(alert.start - padding).toISOString();
  const end = new Date(alert.start + padding).toISOString();
  return { start, end };
}

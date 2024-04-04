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

import { i18n } from '@kbn/i18n';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import {
  CONTAINER_ID,
  HOST_NAME,
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
    const {
      serviceSummary,
      downstreamDependencies,
      logCategories,
      serviceChangePoints,
      exitSpanChangePoints,
      anomalies,
    } = await callApmApi(
      'GET /internal/apm/assistant/get_apm_alert_details_context',
      {
        signal: null,
        params: {
          query: {
            [SERVICE_NAME]: alert.fields[SERVICE_NAME],
            [HOST_NAME]: alert.fields[HOST_NAME],
            [CONTAINER_ID]: alert.fields[CONTAINER_ID],
            [SERVICE_ENVIRONMENT]: alert.fields[SERVICE_ENVIRONMENT],
            [TRANSACTION_TYPE]: alert.fields[TRANSACTION_TYPE],
            [TRANSACTION_NAME]: alert.fields[TRANSACTION_NAME],
            alert_started_at: new Date(alert.start).toISOString(),
          },
        },
      }
    );

    const serviceName = alert.fields[SERVICE_NAME];
    const serviceEnvironment = alert.fields[SERVICE_ENVIRONMENT];

    const content = {
      apmAlertContext: dedent(
        `High level information about the service where the alert occurred. Use this as background but do not repeat this information to the user. 
        ${JSON.stringify(serviceSummary)}
  
        Downstream dependencies from the service "${serviceName}". Problems in these services can negatively affect the performance of "${serviceName}":
        ${JSON.stringify(downstreamDependencies)}
  
        Significant change points for "${serviceName}". Use this to spot dips or spikes in throughput, latency and failure rate.
        ${JSON.stringify(serviceChangePoints)}

        Significant change points for the dependencies of "${serviceName}". Use this to spot dips or spikes in throughput, latency and failure rate for downstream dependencies:
        ${JSON.stringify(exitSpanChangePoints)}
  
        Log events occurring around the time of the alert. The log messages can sometimes diagnose the root cause of the alert:
        ${JSON.stringify(logCategories)}

        Anomalies for services running in the environment "${serviceEnvironment}"
        ${anomalies}
  
        Help the user understand the root cause of the alert by using the above information. Suggest actions the user should take to investigate further.
        `
      ),
    };

    return [
      createFunctionRequestMessage({
        name: 'get_apm_alert_details_context',
        args: {},
      }).message,

      createFunctionResponseMessage({
        name: 'get_apm_alert_details_context',
        content,
        data: content,
      }).message,
    ];
  }, [alert]);

  if (!ObservabilityAIAssistantContextualInsight) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <ObservabilityAIAssistantContextualInsight
          title={i18n.translate(
            'xpack.apm.alertDetailContextualInsights.InsightButtonLabel',
            { defaultMessage: 'Help me understand this alert' }
          )}
          messages={getPromptMessages}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

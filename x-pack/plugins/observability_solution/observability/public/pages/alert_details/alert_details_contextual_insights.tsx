/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import dedent from 'dedent';
import { useKibana } from '../../utils/kibana_react';
import { AlertData } from '../../hooks/use_fetch_alert_detail';

export function AlertDetailContextualInsights({ alert }: { alert: AlertData | null }) {
  const {
    services: { observabilityAIAssistant, http },
  } = useKibana();

  const ObservabilityAIAssistantContextualInsight =
    observabilityAIAssistant?.ObservabilityAIAssistantContextualInsight;

  const getPromptMessages = useCallback(async () => {
    const fields = alert?.formatted.fields as Record<string, string> | undefined;
    if (!observabilityAIAssistant || !fields) {
      return [];
    }

    const res = await http.get('/internal/apm/assistant/get_obs_alert_details_context', {
      query: {
        alert_started_at: alert?.formatted.start,

        // service fields
        'service.name': fields['service.name'],
        'service.environment': fields['service.environment'],
        'transaction.type': fields['transaction.type'],
        'transaction.name': fields['transaction.name'],

        // infra fields
        'host.name': fields['host.name'],
        'container.id': fields['container.id'],
      },
    });

    const {
      serviceSummary,
      downstreamDependencies,
      logCategories,
      serviceChangePoints,
      exitSpanChangePoints,
      anomalies,
    } = res as any;

    const serviceName = fields['service.name'];
    const serviceEnvironment = fields['service.environment'];

    const apmAlertContext = dedent(
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
    );

    return observabilityAIAssistant.getContextualInsightMessages({
      message: `I'm looking at an alert and trying to understand why it was triggered`,
      instructions: dedent(
        `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next. ${apmAlertContext}`
      ),
    });
  }, [alert, http, observabilityAIAssistant]);

  if (!ObservabilityAIAssistantContextualInsight) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <ObservabilityAIAssistantContextualInsight
          title={i18n.translate(
            'xpack.observability.alertDetailContextualInsights.InsightButtonLabel',
            { defaultMessage: 'Help me understand this alert' }
          )}
          messages={getPromptMessages}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

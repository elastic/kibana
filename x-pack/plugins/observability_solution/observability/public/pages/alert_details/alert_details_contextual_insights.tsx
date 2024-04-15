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
import { isEmpty } from 'lodash';
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
    if (!observabilityAIAssistant || !fields || !alert) {
      return [];
    }

    const res = await http.get('/internal/apm/assistant/get_obs_alert_details_context', {
      query: {
        alert_started_at: new Date(alert.formatted.start).toISOString(),

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

    const obsAlertContext = `${
      !isEmpty(serviceSummary)
        ? `Metadata for the service where the alert occurred:
${JSON.stringify(serviceSummary, null, 2)}`
        : ''
    }

    ${
      !isEmpty(downstreamDependencies)
        ? `Downstream dependencies from the service "${serviceName}". Problems in these services can negatively affect the performance of "${serviceName}":
${JSON.stringify(downstreamDependencies, null, 2)}`
        : ''
    }
    
    ${
      !isEmpty(serviceChangePoints)
        ? `Significant change points for "${serviceName}". Use this to spot dips and spikes in throughput, latency and failure rate:
    ${JSON.stringify(serviceChangePoints, null, 2)}`
        : ''
    }
  
    ${
      !isEmpty(exitSpanChangePoints)
        ? `Significant change points for the dependencies of "${serviceName}". Use this to spot dips or spikes in throughput, latency and failure rate for downstream dependencies:
    ${JSON.stringify(exitSpanChangePoints, null, 2)}`
        : ''
    }
    
    ${
      !isEmpty(logCategories)
        ? `Log events occurring around the time of the alert:
    ${JSON.stringify(logCategories, null, 2)}`
        : ''
    }
  
    ${
      !isEmpty(anomalies)
        ? `Anomalies for services running in the environment "${serviceEnvironment}":
    ${anomalies}`
        : ''
    }          
    `;

    return observabilityAIAssistant.getContextualInsightMessages({
      message: `I'm looking at an alert and trying to understand why it was triggered`,
      instructions: dedent(
        `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.
        Please use the following contexual information to determine the cause of the alert and suggest actions that I should take to investigate further.

        ${obsAlertContext}

        Do not output the alert details as bullet points.
        Instead, provide a summary of the alert and the context around it.
        For example, if the alert is about a high error rate, provide information about the service, the environment, and any changes that may have occurred around the time of the alert.
        Print timestamps as relative time, with absolute time in parentheses. Example: "The alert started 5 minutes ago (2021-01-01T00:00:00Z)
        `
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

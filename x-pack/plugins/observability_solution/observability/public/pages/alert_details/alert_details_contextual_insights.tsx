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
import { type AlertDetailsContextualInsight } from '../../../server/services';
import { useKibana } from '../../utils/kibana_react';
import { AlertData } from '../../hooks/use_fetch_alert_detail';

export function AlertDetailContextualInsights({ alert }: { alert: AlertData | null }) {
  const {
    services: { observabilityAIAssistant, http },
  } = useKibana();

  const ObservabilityAIAssistantContextualInsight =
    observabilityAIAssistant?.ObservabilityAIAssistantContextualInsight;

  const getAlertContextMessages = useCallback(async () => {
    const fields = alert?.formatted.fields as Record<string, string> | undefined;
    if (!observabilityAIAssistant || !fields || !alert) {
      return [];
    }

    try {
      const { alertContext } = await http.get<{
        alertContext: AlertDetailsContextualInsight[];
      }>('/internal/observability/assistant/alert_details_contextual_insights', {
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
          'kubernetes.pod.name': fields['kubernetes.pod.name'],
        },
      });

      const obsAlertContext = alertContext
        .map(({ description, data }) => `${description}:\n${JSON.stringify(data, null, 2)}`)
        .join('\n\n');

      return observabilityAIAssistant.getContextualInsightMessages({
        message: `I'm looking at an alert and trying to understand why it was triggered`,
        instructions: dedent(
          `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.

        The following contextual information is available to help you understand the alert:
        ${obsAlertContext}

        Be brief and to the point.
        Do not list the alert details as bullet points.
        Refer to the contextual information provided above when relevant.
        Pay special attention to regressions in downstream dependencies like big increases or decreases in throughput, latency or failure rate
        Suggest reasons why the alert happened and what may have contributed to it.
        `
        ),
      });
    } catch (e) {
      console.error('An error occurred while fetching alert context', e);
      return observabilityAIAssistant.getContextualInsightMessages({
        message: `I'm looking at an alert and trying to understand why it was triggered`,
        instructions: dedent(
          `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.`
        ),
      });
    }
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
          messages={getAlertContextMessages}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

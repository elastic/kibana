/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { RootCauseAnalysisForServiceEvent } from '@kbn/observability-utils-server/llm/service_rca';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { ALERT_START } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import moment from 'moment';
import React, { useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useInvestigation } from '../../contexts/investigation_context';

export interface InvestigationContextualInsight {
  key: string;
  description: string;
  data: unknown;
}

export function AssistantHypothesis({ investigationId }: { investigationId: string }) {
  const { alert } = useInvestigation();
  const {
    core: { notifications },
    services: { investigateAppRepositoryClient },
    dependencies: {
      start: {
        observabilityAIAssistant: { useGenAIConnectors },
        observabilityAIAssistantApp: { RootCauseAnalysisContainer },
      },
    },
  } = useKibana();

  const { loading: loadingConnector, selectedConnector } = useGenAIConnectors();

  const serviceName = alert?.['service.name'] as string | undefined;

  const [events, setEvents] = useState<RootCauseAnalysisForServiceEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const runRootCauseAnalysis = ({
    alert: nonNullishAlert,
    connectorId,
    serviceName: nonNullishServiceName,
  }: {
    alert: EcsFieldsResponse;
    connectorId: string;
    serviceName: string;
  }) => {
    const start = moment(nonNullishAlert[ALERT_START]);

    const minutesSinceStart = Math.abs(moment().diff(start)) / 1000 / 60;

    const minutesBeforeAlertStart = Math.min(30, Math.max(5, Math.ceil(minutesSinceStart)));

    const rangeFrom = moment(nonNullishAlert[ALERT_START])
      .subtract(minutesBeforeAlertStart, 'minute')
      .toISOString();

    const rangeTo = new Date().toISOString();

    const signal = new AbortController().signal;

    setLoading(true);

    investigateAppRepositoryClient
      .stream('POST /internal/observability/investigation/root_cause_analysis', {
        params: {
          body: {
            connectorId,
            context: `The user is investigating an alert for the ${serviceName} service,
            and wants to find the root cause. Here is the alert:
            
            ${JSON.stringify(alert)}`,
            rangeFrom,
            rangeTo,
            serviceName: nonNullishServiceName,
          },
        },
        signal,
      })
      .subscribe({
        next: (event) => {
          setEvents((prev) => {
            if ('type' in event.event && event.event.type === 'chatCompletionChunk') {
              return prev;
            }
            return prev.concat(event.event);
          });
        },
        error: (error) => {
          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.investigateApp.assistantHypothesis.failedToLoadAnalysis', {
              defaultMessage: `Failed to load analysis`,
            }),
          });
          setLoading(false);
        },
        complete: () => {
          setLoading(false);
        },
      });
  };

  if (!serviceName) {
    return null;
  }

  return (
    <RootCauseAnalysisContainer
      events={events}
      loading={loading || loadingConnector}
      onStartAnalysisClick={() => {
        if (alert && selectedConnector && serviceName) {
          runRootCauseAnalysis({
            alert,
            connectorId: selectedConnector,
            serviceName,
          });
        }
      }}
    />
  );
}

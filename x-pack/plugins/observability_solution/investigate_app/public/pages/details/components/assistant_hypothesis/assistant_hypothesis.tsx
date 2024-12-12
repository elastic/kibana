/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { RootCauseAnalysisEvent } from '@kbn/observability-ai-server/root_cause_analysis';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import React, { useState, useRef, useEffect } from 'react';
import { omit } from 'lodash';
import {
  ALERT_FLAPPING_HISTORY,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_RULE_EXECUTION_UUID,
  EVENT_ACTION,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { useKibana } from '../../../../hooks/use_kibana';
import { useInvestigation } from '../../contexts/investigation_context';
import { useUpdateInvestigation } from '../../../../hooks/use_update_investigation';

export interface InvestigationContextualInsight {
  key: string;
  description: string;
  data: unknown;
}

export function AssistantHypothesis({ investigationId }: { investigationId: string }) {
  const {
    alert,
    globalParams: { timeRange },
    investigation,
  } = useInvestigation();
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

  const { mutateAsync: updateInvestigation } = useUpdateInvestigation();

  const { loading: loadingConnector, selectedConnector } = useGenAIConnectors();

  const serviceName = alert?.['service.name'] as string | undefined;

  const [events, setEvents] = useState<RootCauseAnalysisEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const controllerRef = useRef(new AbortController());

  useEffect(() => {
    if (investigation?.rootCauseAnalysis) {
      setEvents(investigation.rootCauseAnalysis.events);
    }
  }, [investigation?.rootCauseAnalysis]);

  const [completeInBackground, setCompleteInBackground] = useState(true);

  const runRootCauseAnalysis = ({
    alert: nonNullishAlert,
    connectorId,
    serviceName: nonNullishServiceName,
  }: {
    alert: EcsFieldsResponse;
    connectorId: string;
    serviceName: string;
  }) => {
    const rangeFrom = timeRange.from;

    const rangeTo = timeRange.to;

    setLoading(true);

    setError(undefined);

    setEvents([]);

    investigateAppRepositoryClient
      .stream('POST /internal/observability/investigation/root_cause_analysis', {
        params: {
          body: {
            investigationId,
            connectorId,
            context: `The user is investigating an alert for the ${serviceName} service,
            and wants to find the root cause. Here is the alert:

            ${JSON.stringify(sanitizeAlert(nonNullishAlert))}`,
            rangeFrom,
            rangeTo,
            serviceName: nonNullishServiceName,
            completeInBackground,
          },
        },
        signal: controllerRef.current.signal,
      })
      .subscribe({
        next: (event) => {
          setEvents((prev) => {
            return prev.concat(event.event);
          });
        },
        error: (nextError) => {
          if (!isRequestAbortedError(nextError)) {
            notifications.toasts.addError(nextError, {
              title: i18n.translate(
                'xpack.investigateApp.assistantHypothesis.failedToLoadAnalysis',
                {
                  defaultMessage: `Failed to load analysis`,
                }
              ),
            });
            setError(nextError);
          } else {
            setError(
              new Error(
                i18n.translate('xpack.investigateApp.assistantHypothesis.analysisAborted', {
                  defaultMessage: `Analysis was aborted`,
                })
              )
            );
          }

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
      completeInBackground={completeInBackground}
      onCompleteInBackgroundClick={() => {
        setCompleteInBackground(() => !completeInBackground);
      }}
      onStopAnalysisClick={() => {
        controllerRef.current.abort();
        controllerRef.current = new AbortController();
      }}
      onClearAnalysisClick={() => {
        setEvents([]);
        if (investigation?.rootCauseAnalysis) {
          updateInvestigation({
            investigationId,
            payload: {
              rootCauseAnalysis: {
                events: [],
              },
            },
          });
        }
      }}
      onResetAnalysisClick={() => {
        controllerRef.current.abort();
        controllerRef.current = new AbortController();
        if (alert && selectedConnector && serviceName) {
          runRootCauseAnalysis({
            alert,
            connectorId: selectedConnector,
            serviceName,
          });
        }
      }}
      error={error}
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

function sanitizeAlert(alert: EcsFieldsResponse) {
  return omit(
    alert,
    ALERT_RULE_EXECUTION_TIMESTAMP,
    '_index',
    ALERT_FLAPPING_HISTORY,
    EVENT_ACTION,
    EVENT_KIND,
    ALERT_RULE_EXECUTION_UUID,
    '@timestamp'
  );
}

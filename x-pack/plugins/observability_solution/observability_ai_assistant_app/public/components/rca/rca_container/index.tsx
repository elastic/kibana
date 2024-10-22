/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-plugin/public';
import type {
  RootCauseAnalysisForServiceEvent,
  RootCauseAnalysisToolMessage,
  RootCauseAnalysisToolRequest,
  ToolErrorMessage,
} from '@kbn/observability-utils-server/llm/service_rca';
import React from 'react';
import { EntityBadge } from '../entity_badge';
import { RootCauseAnalysisCallout } from '../rca_callout';
import { RootCauseAnalysisEntityInvestigation } from '../rca_entity_investigation';
import { RootCauseAnalysisHypothesizeStepItem } from '../rca_hypothesize_step';
import { RootCauseAnalysisReport } from '../rca_report';
import { RootCauseAnalysisStepItem } from '../rca_step';
import { RootCauseAnalysisTaskStepItem } from '../rca_task_step';

export function RootCauseAnalysisContainer({
  events,
  onStartAnalysisClick,
  loading,
}: {
  events?: RootCauseAnalysisForServiceEvent[];
  onStartAnalysisClick: () => void;
  loading: boolean;
}) {
  if (!events?.length && !loading) {
    return <RootCauseAnalysisCallout onClick={onStartAnalysisClick} />;
  }

  const elements: React.ReactElement[] = [];

  if (loading || !events) {
    elements.push(
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
        <EuiLoadingSpinner size="s" />
      </EuiFlexGroup>
    );
  }

  function getToolResponseErrorItem(response: ToolErrorMessage['response']) {
    return (
      <RootCauseAnalysisStepItem
        label={i18n.translate('xpack.observabilityAiAssistant.rca.toolResponseError', {
          defaultMessage: 'Failed to execute task: {errorMessage}',
          values: {
            error: response.error.message,
          },
        })}
        iconType="alert"
        color="danger"
      />
    );
  }

  function getToolResponseItem(message: RootCauseAnalysisToolMessage | ToolErrorMessage) {
    const response = message.response;
    if ('error' in response) {
      return getToolResponseErrorItem(response);
    }
    if ('instructions' in message.response) {
      const analysis = message.response.analysis;
      const data = 'data' in message ? message.data : undefined;
      return analysis && data ? (
        <RootCauseAnalysisEntityInvestigation
          summary={analysis.summary}
          entity={analysis.entity}
          ownPatterns={data.attachments.ownPatterns}
          patternsFromOtherEntities={data.attachments.patternsFromOtherEntities}
        />
      ) : (
        <RootCauseAnalysisStepItem
          label={i18n.translate('xpack.observabilityAiAssistant.rca.entityNotFound', {
            defaultMessage: 'Entity not found',
          })}
          iconType="alert"
          color="warning"
        />
      );
    }

    if ('report' in message.response) {
      return (
        <RootCauseAnalysisReport
          report={message.response.report}
          timeline={message.response.timeline}
        />
      );
    }
  }

  function getTaskItem(toolCall: RootCauseAnalysisToolRequest) {
    if (toolCall.function.name === 'hypothesize') {
      return <RootCauseAnalysisHypothesizeStepItem content={toolCall.function.arguments.content} />;
    }
    const toolResponse = events?.find((event) => {
      return (
        'role' in event &&
        event.role === MessageRole.Tool &&
        event.toolCallId === toolCall.toolCallId
      );
    });

    const isPending = !toolResponse;
    const isError = !!(toolResponse && 'error' in toolResponse);

    let label: React.ReactNode;

    switch (toolCall.function.name) {
      case 'concludeAnalysis':
        label = i18n.translate('xpack.observabilityAiAssistant.rca.finalizingReport', {
          defaultMessage: `Finalizing report`,
        });
        break;

      case 'findRelatedEntities':
        label = i18n.translate('xpack.observabilityAiAssistant.rca.findingRelatedEntities', {
          defaultMessage: `Finding related entities`,
        });
        break;

      case 'analyzeEntityHealth':
        label = (
          <EuiFlexGroup direction="row" gutterSize="s">
            {i18n.translate('xpack.observabilityAiAssistant.rca.investigatingEntity', {
              defaultMessage: `Investigating`,
            })}
            <EntityBadge
              entity={Object.fromEntries(
                toolCall.function.arguments.entity.fields.map(({ field, value }) => [field, value])
              )}
            />
          </EuiFlexGroup>
        );
        break;
    }

    return (
      <RootCauseAnalysisTaskStepItem
        label={label}
        status={isError ? 'failure' : isPending ? 'pending' : 'completed'}
      />
    );
  }

  events?.forEach((event) => {
    if ('type' in event && event.type === ChatCompletionEventType.ChatCompletionMessage) {
      event.toolCalls.forEach((toolCall) => {
        elements.push(getTaskItem(toolCall));
      });
      return;
    }
    if (!('role' in event) || event.role !== MessageRole.Tool) {
      return;
    }

    const element = getToolResponseItem(event);
    if (element) {
      elements.push(element);
    }
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {elements.map((element, index) => {
        return React.cloneElement(element, { key: index });
      })}
    </EuiFlexGroup>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolMessage } from '@kbn/inference-plugin/common';
import { MessageRole } from '@kbn/inference-plugin/public';
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
            errorMessage: response.error.message,
          },
        })}
        iconType="alert"
        color="danger"
      />
    );
  }

  function getToolResponseItem(
    message: RootCauseAnalysisToolMessage | ToolErrorMessage
  ): React.ReactElement {
    if (message.name === 'error') {
      return getToolResponseErrorItem(message.response);
    }

    if (message.name === 'investigateEntity') {
      return (
        <RootCauseAnalysisEntityInvestigation
          summary={message.response.summary}
          entity={message.response.entity}
          ownPatterns={message.data.attachments.ownPatterns}
          patternsFromOtherEntities={message.data.attachments.patternsFromOtherEntities}
        />
      );
    }

    if (message.name === 'observe') {
      return <RootCauseAnalysisHypothesizeStepItem content={message.response.content} />;
    }

    return (
      <RootCauseAnalysisReport
        report={message.response.report}
        timeline={message.response.timeline}
      />
    );
  }

  function getTaskItem(toolCall: RootCauseAnalysisToolRequest) {
    const toolResponse = events?.find((event) => {
      return (
        'role' in event &&
        event.role === MessageRole.Tool &&
        event.toolCallId === toolCall.toolCallId
      );
    }) as Extract<RootCauseAnalysisForServiceEvent, ToolMessage> | undefined;

    const isPending = !toolResponse;
    const isError = !!(toolResponse && 'error' in toolResponse);

    if (toolResponse) {
      return getToolResponseItem(toolResponse);
    }

    let label: React.ReactNode;

    switch (toolCall.function.name) {
      case 'endProcessAndWriteReport':
        label = i18n.translate('xpack.observabilityAiAssistant.rca.finalizingReport', {
          defaultMessage: `Finalizing report`,
        });
        break;

      case 'observe':
        label = i18n.translate('xpack.observabilityAiAssistant.rca.summarizingInvestigation', {
          defaultMessage: `Thinking...`,
        });
        break;

      case 'investigateEntity':
        label = (
          <EuiFlexGroup direction="row" gutterSize="s">
            {i18n.translate('xpack.observabilityAiAssistant.rca.investigatingEntity', {
              defaultMessage: `Investigating`,
            })}
            <EntityBadge
              entity={{
                [toolCall.function.arguments.entity.field]:
                  toolCall.function.arguments.entity.value,
              }}
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
    if (event.role === MessageRole.Assistant) {
      event.toolCalls.forEach((toolCall) => {
        elements.push(getTaskItem(toolCall));
      });
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

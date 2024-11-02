/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolMessage, MessageRole, AssistantMessage } from '@kbn/inference-common';
import type {
  RootCauseAnalysisEvent,
  RootCauseAnalysisToolMessage,
  RootCauseAnalysisToolRequest,
  ToolErrorMessage,
} from '@kbn/observability-ai-server/root_cause_analysis';
import React from 'react';
import { findLast } from 'lodash';
import {
  RCA_END_PROCESS_TOOL_NAME,
  RCA_INVESTIGATE_ENTITY_TOOL_NAME,
} from '@Kbn/observability-ai-common/root_cause_analysis';
import { EntityBadge } from '../entity_badge';
import { RootCauseAnalysisCallout } from '../rca_callout';
import { RootCauseAnalysisEntityInvestigation } from '../rca_entity_investigation';
import { RootCauseAnalysisHypothesizeStepItem } from '../rca_hypothesize_step';
import { RootCauseAnalysisReport } from '../rca_report';
import { RootCauseAnalysisStepItem } from '../rca_step';
import { RootCauseAnalysisStopButton } from '../rca_stop_button';

export function RootCauseAnalysisContainer({
  events,
  onStartAnalysisClick,
  onStopAnalysisClick,
  onResetAnalysisClick,
  loading,
  error,
}: {
  events?: RootCauseAnalysisEvent[];
  onStartAnalysisClick: () => void;
  onStopAnalysisClick: () => void;
  onResetAnalysisClick: () => void;
  loading: boolean;
  error?: Error;
}) {
  if (!events?.length && !loading) {
    return <RootCauseAnalysisCallout onClick={onStartAnalysisClick} />;
  }

  const elements: React.ReactElement[] = [];

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

  events?.forEach((event) => {
    if (event.role === MessageRole.Tool) {
      const nextElement = getToolResponseItem(event);
      if (nextElement) {
        elements.push(nextElement);
      }
    }
  });

  if (loading) {
    const label = getLoadingLabel(events);
    elements.push(
      <RootCauseAnalysisStepItem
        label={
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow>{label}</EuiFlexItem>
            <RootCauseAnalysisStopButton
              onClick={() => {
                onStopAnalysisClick();
              }}
            />
          </EuiFlexGroup>
        }
        loading
      />
    );
  } else if (error) {
    elements.push(
      <RootCauseAnalysisStepItem
        label={
          <EuiFlexGroup>
            <EuiFlexItem grow>
              {i18n.translate('xpack.observabilityAiAssistant.rca.analysisError', {
                defaultMessage: 'Failed to complete analysis: {errorMessage}',
                values: {
                  errorMessage: error.message,
                },
              })}
            </EuiFlexItem>
            <EuiButton
              data-test-subj="observabilityAiAssistantAppRootCauseAnalysisRestartButton"
              color="danger"
              fill
              onClick={() => {
                onResetAnalysisClick();
              }}
              iconType="refresh"
            >
              {i18n.translate('xpack.observabilityAiAssistant.rca.restartButtonLabel', {
                defaultMessage: 'Restart',
              })}
            </EuiButton>
          </EuiFlexGroup>
        }
        iconType="alert"
        color="danger"
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {elements.map((element, index) => {
        return React.cloneElement(element, { key: index });
      })}
    </EuiFlexGroup>
  );
}

function getLoadingLabel(events?: RootCauseAnalysisEvent[]) {
  const lastAssistantMessage = findLast(
    events,
    (event): event is Extract<RootCauseAnalysisEvent, AssistantMessage> =>
      event.role === MessageRole.Assistant
  );

  if (lastAssistantMessage) {
    const toolResponsesByToolCallId = new Map(
      events
        ?.filter(
          (event): event is Extract<RootCauseAnalysisEvent, ToolMessage> =>
            event.role === MessageRole.Tool
        )
        .map((event) => [event.toolCallId, event])
    );
    const pendingToolCalls = lastAssistantMessage.toolCalls.filter((event) => {
      const response = toolResponsesByToolCallId.get(event.toolCallId);

      return !response;
    });

    const allInvestigateEntityToolCalls = pendingToolCalls.filter(
      (event): event is RootCauseAnalysisToolRequest<typeof RCA_INVESTIGATE_ENTITY_TOOL_NAME> =>
        event.function.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME
    );

    if (allInvestigateEntityToolCalls.length) {
      return (
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
          <EuiText size="s">
            {i18n.translate('xpack.observabilityAiAssistant.rca.investigatingEntitiesTextLabel', {
              defaultMessage: 'Investigating entities',
            })}
          </EuiText>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              {allInvestigateEntityToolCalls.map((toolCall) => {
                return (
                  <EuiFlexItem key={toolCall.toolCallId}>
                    <EntityBadge
                      entity={{
                        [toolCall.function.arguments.entity.field]:
                          toolCall.function.arguments.entity.value,
                      }}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (pendingToolCalls[0]?.function.name === RCA_END_PROCESS_TOOL_NAME) {
      return i18n.translate('xpack.observabilityAiAssistant.rca.finalizingReport', {
        defaultMessage: 'Finalizing report',
      });
    }
  }

  return i18n.translate('xpack.observabilityAiAssistant.rca.analysisLoadingLabel', {
    defaultMessage: 'Thinking...',
  });
}

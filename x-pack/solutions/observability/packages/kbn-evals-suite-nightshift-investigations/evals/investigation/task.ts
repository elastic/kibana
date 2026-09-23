/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { HttpHandler } from '@kbn/core/public';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type {
  StartInvestigationResponse,
  GetInvestigationResponse,
} from '@kbn/nightshift-investigations-plugin/common';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { InvestigationExample, InvestigationTaskOutput } from './types';

/** Runs a manual product investigation and retains its persisted report and conversation evidence. */
export const runInvestigation = async (
  fetch: HttpHandler,
  example: InvestigationExample
): Promise<InvestigationTaskOutput> => {
  const started = Date.now();
  const output: InvestigationTaskOutput = {
    case_id: example.metadata.case_id,
    query: example.input.question,
  };
  let investigation: GetInvestigationResponse | undefined;
  try {
    const { investigation_id: investigationId } = await fetch<StartInvestigationResponse>(
      '/internal/nightshift/investigations',
      {
        method: 'POST',
        body: JSON.stringify({ subject: { type: 'manual' }, message: example.input.question }),
      }
    );
    output.investigation_id = investigationId;
    const investigationPath = `/internal/nightshift/investigations/${encodeURIComponent(
      investigationId
    )}`;
    investigation = await fetch<GetInvestigationResponse>(investigationPath);
    while (investigation.status === 'pending' || investigation.status === 'running') {
      output.workflow_status = investigation.status;
      output.conversation_id = investigation.conversation_id;
      if (Date.now() - started > 20 * 60_000) {
        throw new Error('Investigation did not reach a terminal status within 20 minutes');
      }
      await setTimeout(1000);
      investigation = await fetch<GetInvestigationResponse>(investigationPath);
    }
  } catch (error) {
    output.execution_error = error instanceof Error ? error.message : String(error);
  }
  if (!investigation || !output.investigation_id) return output;

  // A timeout or failed poll must not discard the conversation accumulated before the failure.
  try {
    output.workflow_status = investigation.status;
    output.conversation_id = investigation.conversation_id;
    if (investigation.status !== 'completed') {
      output.execution_error ??= investigation.error || `Investigation ${investigation.status}`;
      // Workflow details enrich the primary error without preventing partial evidence collection.
      const workflow = await fetch<WorkflowExecutionDto>(
        `/api/workflows/executions/${encodeURIComponent(output.investigation_id)}`,
        { headers: { 'elastic-api-version': '2023-10-31' } }
      ).catch(() => undefined);
      if (workflow) {
        output.execution_error =
          workflow.stepExecutions.find(({ stepId }) => stepId === 'investigate')?.error?.message ||
          workflow.error?.message ||
          output.execution_error;
      }
    }
    const {
      summary,
      conclusion,
      severity,
      hypotheses,
      recommendations,
      blind_spots: blindSpots,
      trigger_feedback: triggerFeedback,
      impact,
    } = investigation;
    output.structured_report = {
      summary,
      conclusion,
      severity,
      hypotheses,
      recommendations,
      blind_spots: blindSpots,
      trigger_feedback: triggerFeedback,
      impact,
    };
    if (output.conversation_id) {
      output.conversation = await fetch<{ rounds: ConversationRound[] }>(
        `/api/agent_builder/conversations/${encodeURIComponent(output.conversation_id)}`,
        { headers: { 'elastic-api-version': '2023-10-31' } }
      );
      output.traceId = output.conversation.rounds
        .flatMap(({ trace_id: traceId }) =>
          typeof traceId === 'string' ? [traceId] : traceId ?? []
        )
        .filter(Boolean)
        .at(-1);
    } else {
      output.execution_error ??= 'Completed investigation has no conversation id';
    }
  } catch (error) {
    output.execution_error ??= error instanceof Error ? error.message : String(error);
  }
  return output;
};

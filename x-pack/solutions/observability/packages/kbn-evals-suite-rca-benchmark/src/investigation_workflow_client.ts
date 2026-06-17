/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import type { ConverseResponse, ConverseUsage } from './agent_builder_client';

const INVESTIGATION_WORKFLOW_ID = 'system-streams-sigevents-investigation';
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);
const POLL_INTERVAL_MS = 15_000;
const MAX_WAIT_MS = 40 * 60_000;

interface SynthesisOutput {
  root_cause: string;
  confidence: number;
  impact: string;
  ranked_hypotheses: Array<{
    rank: number;
    hypothesis_id: string;
    statement: string;
    verdict: string;
    prior_confidence: number;
    posterior_confidence: number;
    evidence_summary: string;
  }>;
  discarded_hypotheses: Array<{
    hypothesis_id: string;
    statement: string;
    discard_reason: string;
  }>;
  gaps_found: string[];
  investigation_complete: boolean;
}

interface StepUsage {
  input_tokens?: number;
  output_tokens?: number;
  llm_calls?: number;
}

interface StepExecution {
  stepId?: string;
  status: string;
  output?: { usage?: StepUsage; [key: string]: unknown } | null;
}

interface WorkflowExecution {
  status: string;
  traceId?: string;
  error?: { message?: string } | null;
  stepExecutions?: StepExecution[];
}

export interface InvestigationInput {
  streamNames: string[];
  scenarioId: string;
  scenarioTitle: string;
  service: string;
  faultType: string;
  connectorId?: string;
}

function formatSynthesisAsMessage(synthesis: SynthesisOutput): string {
  const lines: string[] = [];
  lines.push(`Investigation complete: ${synthesis.investigation_complete}`);
  lines.push(`Root cause: ${synthesis.root_cause}`);
  lines.push(`Confidence: ${(synthesis.confidence * 100).toFixed(0)}%`);
  lines.push(`Impact: ${synthesis.impact}`);
  lines.push('');

  if ((synthesis.ranked_hypotheses ?? []).length > 0) {
    lines.push('Ranked hypotheses:');
    for (const h of synthesis.ranked_hypotheses) {
      lines.push(
        `  ${h.rank}. [${h.verdict}] ${h.statement} (posterior confidence: ${(h.posterior_confidence * 100).toFixed(0)}%)`
      );
      lines.push(`     Evidence: ${h.evidence_summary}`);
    }
    lines.push('');
  }

  if ((synthesis.discarded_hypotheses ?? []).length > 0) {
    lines.push('Discarded hypotheses:');
    for (const h of synthesis.discarded_hypotheses) {
      lines.push(`  - ${h.statement} (reason: ${h.discard_reason})`);
    }
    lines.push('');
  }

  if ((synthesis.gaps_found ?? []).length > 0) {
    lines.push(`Gaps: ${synthesis.gaps_found.join('; ')}`);
  }

  return lines.join('\n');
}

export class InvestigationWorkflowClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog
  ) {}

  async run(input: InvestigationInput): Promise<ConverseResponse> {
    const { streamNames, scenarioId, service, faultType, connectorId } = input;
    const opaqueId = randomUUID();
    const discoveryId = `eval-${opaqueId}`;

    this.log.info(`[investigation-workflow] Triggering workflow for scenario: ${scenarioId}`);

    const { workflowExecutionId } = (await this.fetch(
      `/api/workflows/workflow/${INVESTIGATION_WORKFLOW_ID}/run`,
      {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          inputs: {
            event_id: `eval-event-${opaqueId}`,
            discovery_id: discoveryId,
            discovery_slug: opaqueId,
            title: `Microservice system degradation or outage`,
            summary: `A microservice system is experiencing degradation or an outage.`,
            question:
              `A microservice system is experiencing degradation or an outage. ` +
              `Investigate the root cause and identify the responsible service. ` +
              `Telemetry is in stream_names (logs, traces, and infrastructure metrics): ${streamNames.join(', ')}. ` +
              `Use available tools to inspect these data streams. ` +
              `Identify: (1) the root cause component, (2) the failure mode, and (3) supporting evidence.`,
            root_cause: '',
            impact: '',
            stream_names: streamNames,
            cause_kis: [],
            evidences: [],
            ...(connectorId ? { connector_id: connectorId } : {}),
          },
        }),
      }
    )) as { workflowExecutionId: string };

    this.log.info(
      `[investigation-workflow] Execution started: ${workflowExecutionId} for scenario ${scenarioId}`
    );

    const execution = await this.pollUntilTerminal(workflowExecutionId, scenarioId);

    return this.buildConverseResponse(execution, workflowExecutionId, scenarioId, service, faultType);
  }

  private async pollUntilTerminal(
    executionId: string,
    scenarioId: string
  ): Promise<WorkflowExecution> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      this.log.info(
        `[investigation-workflow] Polling ${executionId} (${elapsed}s elapsed) for ${scenarioId}`
      );

      const execution = (await this.fetch(`/api/workflows/executions/${executionId}`, {
        version: '2023-10-31',
        query: { includeOutput: true },
      })) as WorkflowExecution;

      if (TERMINAL_STATUSES.has(execution.status)) {
        this.log.info(
          `[investigation-workflow] Execution ${executionId} terminal with status: ${execution.status}`
        );
        return execution;
      }
    }

    throw new Error(
      `Investigation workflow execution ${executionId} timed out after ${MAX_WAIT_MS / 60_000} minutes`
    );
  }

  private buildConverseResponse(
    execution: WorkflowExecution,
    executionId: string,
    scenarioId: string,
    service: string,
    faultType: string
  ): ConverseResponse {
    const synthesizeStep = execution.stepExecutions?.find(
      (s) => s.stepId === 'synthesize' && s.output != null
    );

    let messageContent: string;
    const errors: unknown[] = [];

    if (execution.status !== 'completed') {
      const errMsg = execution.error?.message ?? `Workflow ended with status: ${execution.status}`;
      this.log.warning(`[investigation-workflow] Non-completed execution ${executionId}: ${errMsg}`);
      errors.push(new Error(errMsg));
    }

    if (synthesizeStep?.output) {
      // ai.agent steps wrap the structured output in { structured_output, conversation_id, message }
      const rawOutput = synthesizeStep.output as { structured_output?: SynthesisOutput } | SynthesisOutput;
      const synthesis = ('structured_output' in rawOutput ? rawOutput.structured_output : rawOutput) as SynthesisOutput;
      messageContent = formatSynthesisAsMessage(synthesis);
      this.log.info(
        `[investigation-workflow] ${scenarioId} synthesis root_cause: ${synthesis.root_cause}`
      );
    } else {
      this.log.warning(
        `[investigation-workflow] No synthesis output found for ${scenarioId} (execution ${executionId})`
      );
      messageContent = 'Investigation workflow did not produce a synthesis result.';
    }

    // Aggregate token usage from all ai.agent step outputs.
    // The ai.agent step handler populates step.output.usage since the token-tracking fix.
    const usage: ConverseUsage = { input_tokens: 0, output_tokens: 0, llm_calls: 0 };
    for (const step of execution.stepExecutions ?? []) {
      const stepUsage = step.output?.usage;
      if (stepUsage) {
        usage.input_tokens += stepUsage.input_tokens ?? 0;
        usage.output_tokens += stepUsage.output_tokens ?? 0;
        usage.llm_calls += stepUsage.llm_calls ?? 0;
      }
    }
    this.log.info(
      `[investigation-workflow] ${scenarioId} usage: ${usage.input_tokens} in / ${usage.output_tokens} out / ${usage.llm_calls} LLM calls`
    );

    const promptMessage =
      `A microservice system in Online Boutique is experiencing a fault. ` +
      `Fault details — service: ${service}, type: ${faultType}. ` +
      `Investigate root cause and identify the responsible service.`;

    return {
      conversationId: executionId,
      traceId: execution.traceId,
      messages: [{ content: promptMessage }, { content: messageContent }],
      steps: [],
      errors,
      usage,
    };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import type { Evaluator } from '@kbn/evals';
import {
  EVIDENCE_FAMILIES,
  familiesReached as reachedFamilies,
} from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/evidence_families';
import type {
  InvestigationExample,
  InvestigationTaskOutput,
  TrajectoryStep,
} from '../investigation/types';
import { getModelFactory, invokeJudge } from '../investigation/judges';
import type { JudgeDeps } from '../investigation/judges';
import { composeAnswerText, composeTrajectoryText } from '../investigation/judges/scoring';
import {
  CAUSAL_STRATEGIES,
  CAUSAL_STRATEGY_IDS,
  checklistScore,
  type StrategyStatus,
} from './strategies';

type RecoveryEvaluator = Evaluator<InvestigationExample, InvestigationTaskOutput>;

export const CAUSAL_CHECKLIST_EVALUATOR = 'causal_checklist';
export const ROOT_CAUSE_EVIDENCE_EVALUATOR = 'root_cause_evidence';
export const EVIDENCE_FAMILIES_EVALUATOR = 'evidence_families';

// Keeps a judge prompt inside its context window; later steps matter most, so the head is cut.
const MAX_TRAJECTORY_CHARS = 90_000;

const NO_RUN_EXPLANATION =
  'The investigation recorded no tool calls or no report, so there is nothing to audit.';

const boundTrajectory = (trajectory: string): string =>
  trajectory.length <= MAX_TRAJECTORY_CHARS
    ? trajectory
    : `[earlier steps omitted]\n${trajectory.slice(-MAX_TRAJECTORY_CHARS)}`;

const strategyList = CAUSAL_STRATEGIES.map(
  ({ id, description, reportOnly }) =>
    `- ${id}${reportOnly ? ' (judge from the report)' : ''}: ${description}`
).join('\n');

const CHECKLIST_SYSTEM = `You audit how thoroughly an investigation analysed an alert recovery. You get the investigation's tool-call trajectory (each call, its arguments and a bounded result) and its final report.

For every strategy below, decide its status:
- "ran": a trajectory step executed it. Give the step number. A report that says it did something, or says it will, does not count without a step that did it.
- "blocked": a step tried it against a source it could not read or that returned nothing usable (denied access, empty indices, a query error that was never worked around).
- "not_run": no step tried it.
Two strategies are judged from the report alone: "ran" when the report does it explicitly, otherwise "not_run".

Be strict. A strategy that was only partly covered, such as one window instead of three, is "ran" only when what was done answers the strategy's question.

Strategies:
${strategyList}`;

const CHECKLIST_USER = `Tool-call trajectory:
{{{trajectory}}}

Final report:
{{{answer}}}`;

export const CausalChecklistJudgePrompt = createPrompt({
  name: 'nightshift_recovery_causal_checklist_judge',
  description: 'Audits which causal-analysis strategies a recovery investigation actually ran.',
  input: lazySchema(() => z.object({ trajectory: z.string(), answer: z.string() })),
})
  .version({
    system: { mustache: { template: CHECKLIST_SYSTEM } },
    template: { mustache: { template: CHECKLIST_USER } },
    tools: {
      score: {
        description: 'Return the status of every strategy and a one-sentence summary.',
        schema: {
          type: 'object',
          properties: {
            strategies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', enum: [...CAUSAL_STRATEGY_IDS] },
                  status: { type: 'string', enum: ['ran', 'blocked', 'not_run'] },
                  step: {
                    type: 'number',
                    description: 'The 1-based trajectory step that ran or tried it; 0 if none.',
                  },
                  note: { type: 'string', description: 'At most one sentence of evidence.' },
                },
                required: ['id', 'status', 'step', 'note'],
              },
            },
            summary: { type: 'string' },
          },
          required: ['strategies', 'summary'],
        },
      },
    },
  } as const)
  .get();

interface ChecklistResult {
  strategies: Array<{ id: string; status: StrategyStatus; step: number; note: string }>;
  summary: string;
}

/** Every strategy gets a status: one the judge left out was not run. */
export const toStrategyStatuses = (
  result: Pick<ChecklistResult, 'strategies'>
): Record<string, StrategyStatus> => {
  const reported = new Map(result.strategies.map(({ id, status }) => [id, status]));
  return Object.fromEntries(
    CAUSAL_STRATEGY_IDS.map((id) => [id, reported.get(id) ?? ('not_run' as const)])
  );
};

export const createCausalChecklistEvaluator = (deps: JudgeDeps): RecoveryEvaluator => ({
  name: CAUSAL_CHECKLIST_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ output }) => {
    const trajectory = composeTrajectoryText(output.tool_call_trajectory);
    const answer = composeAnswerText(output.structured_report);
    if (!trajectory || !answer) {
      return { score: null, label: 'n/a', explanation: NO_RUN_EXPLANATION };
    }
    const result = await invokeJudge<ChecklistResult>(
      deps,
      CAUSAL_CHECKLIST_EVALUATOR,
      CausalChecklistJudgePrompt,
      { trajectory: boundTrajectory(trajectory), answer }
    );
    const statuses = toStrategyStatuses(result);
    const count = (wanted: StrategyStatus) =>
      Object.values(statuses).filter((status) => status === wanted).length;
    const notRun = CAUSAL_STRATEGY_IDS.filter((id) => statuses[id] === 'not_run');
    return {
      score: checklistScore(statuses),
      label: `${count('ran')} ran / ${count('blocked')} blocked / ${count('not_run')} not run`,
      explanation: `${result.summary} Not run: ${notRun.join(', ') || 'none'}.`,
      metadata: { strategy_status: statuses },
    };
  },
});

const ROOT_CAUSE_SYSTEM = `You judge whether an alert-recovery investigation actually explained the incident, using only what its tool calls returned. You get the tool-call trajectory and the final report.

Score two things, each 0, 0.5 or 1:
- mechanism_evidenced: does the report name a specific mechanism for the alert-driving failure (what is failing and why), and do trajectory results support it directly? 1 = the mechanism is named and a result shows it at the request or log level, such as an error text tied to the failing requests. 0.5 = a plausible mechanism supported only by correlation, aggregates or one indirect result. 0 = unknown, or asserted without a result behind it.
- closure_evidenced: does the report say why the alerting system closed the alert (what changed for the rule, not only that the symptom persisted), and do trajectory results support it? Same scale.

Also report unsupported_claim: true when the report states a cause, a number or a time that no trajectory result contains.

"Unknown" is an honest answer and scores 0 on that item, but is not an unsupported claim.`;

const ROOT_CAUSE_USER = `Tool-call trajectory:
{{{trajectory}}}

Final report:
{{{answer}}}`;

export const RootCauseEvidenceJudgePrompt = createPrompt({
  name: 'nightshift_recovery_root_cause_evidence_judge',
  description: 'Scores whether a recovery investigation evidenced the mechanism and the closure.',
  input: lazySchema(() => z.object({ trajectory: z.string(), answer: z.string() })),
})
  .version({
    system: { mustache: { template: ROOT_CAUSE_SYSTEM } },
    template: { mustache: { template: ROOT_CAUSE_USER } },
    tools: {
      score: {
        description: 'Return the two evidence scores, the claims they judge and the reasoning.',
        schema: {
          type: 'object',
          properties: {
            mechanism_claim: {
              type: 'string',
              description: 'The mechanism the report names, or "none".',
            },
            mechanism_evidenced: { type: 'number', description: '0, 0.5 or 1.' },
            closure_claim: { type: 'string', description: 'Why the alert closed, or "none".' },
            closure_evidenced: { type: 'number', description: '0, 0.5 or 1.' },
            unsupported_claim: { type: 'boolean' },
            reasoning: { type: 'string' },
          },
          required: [
            'mechanism_claim',
            'mechanism_evidenced',
            'closure_claim',
            'closure_evidenced',
            'unsupported_claim',
            'reasoning',
          ],
        },
      },
    },
  } as const)
  .get();

const clampHalf = (value: number): number => Math.min(1, Math.max(0, value));

export const createRootCauseEvidenceEvaluator = (deps: JudgeDeps): RecoveryEvaluator => ({
  name: ROOT_CAUSE_EVIDENCE_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ output }) => {
    const trajectory = composeTrajectoryText(output.tool_call_trajectory);
    const answer = composeAnswerText(output.structured_report);
    if (!trajectory || !answer) {
      return { score: null, label: 'n/a', explanation: NO_RUN_EXPLANATION };
    }
    const result = await invokeJudge<{
      mechanism_claim: string;
      mechanism_evidenced: number;
      closure_claim: string;
      closure_evidenced: number;
      unsupported_claim: boolean;
      reasoning: string;
    }>(deps, ROOT_CAUSE_EVIDENCE_EVALUATOR, RootCauseEvidenceJudgePrompt, {
      trajectory: boundTrajectory(trajectory),
      answer,
    });
    const mechanism = clampHalf(result.mechanism_evidenced);
    const closure = clampHalf(result.closure_evidenced);
    return {
      score: (mechanism + closure) / 2,
      label: result.unsupported_claim ? 'unsupported_claim' : 'supported',
      explanation: `mechanism (${mechanism}): ${result.mechanism_claim}. closure (${closure}): ${result.closure_claim}. ${result.reasoning}`,
      metadata: {
        mechanism_evidenced: mechanism,
        closure_evidenced: closure,
        unsupported_claim: result.unsupported_claim,
      },
    };
  },
});

const stepText = ({ tool_id: toolId, params }: TrajectoryStep) => ({
  tool_id: toolId,
  arguments: params,
});

/** The evidence families a trajectory reached, from the calls' arguments alone. */
export const familiesReached = (trajectory: TrajectoryStep[] | undefined): string[] =>
  reachedFamilies((trajectory ?? []).map(stepText));

export const evidenceFamiliesEvaluator: RecoveryEvaluator = {
  name: EVIDENCE_FAMILIES_EVALUATOR,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    if (!output.tool_call_trajectory?.length) {
      return { score: null, label: 'n/a', explanation: NO_RUN_EXPLANATION };
    }
    const reached = familiesReached(output.tool_call_trajectory);
    return {
      score: reached.length / EVIDENCE_FAMILIES.length,
      label: `${reached.length}/${EVIDENCE_FAMILIES.length} families`,
      explanation: `Queried: ${reached.join(', ') || 'none'}.`,
      metadata: { families: reached },
    };
  },
};

export const createRecoveryEvaluators = (deps: JudgeDeps): RecoveryEvaluator[] => [
  createCausalChecklistEvaluator(deps),
  createRootCauseEvidenceEvaluator(deps),
  evidenceFamiliesEvaluator,
];

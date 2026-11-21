/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { renderRound } from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/render_round';
import { strategyTags } from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/causal_checklist';
import {
  RECOVERY_CHECKLIST_TOOL_NAME,
  recoveryChecklistOutputSchema,
  recoveryChecklistPrompt,
} from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/causal_checklist/prompt';
import {
  createEvidenceFamiliesPrompt,
  queriedFamilies,
  RECOVERY_EVIDENCE_FAMILIES_TOOL_NAME,
  recoveryEvidenceFamiliesOutputSchema,
} from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/evidence_families/prompt';
import {
  RECOVERY_ROOT_CAUSE_TOOL_NAME,
  recoveryRootCauseOutputSchema,
  recoveryRootCausePrompt,
} from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/root_cause_evidence/prompt';
import { evidenceLevel } from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/root_cause_evidence';
import type { InvestigationExample, InvestigationTaskOutput } from '../investigation/types';
import { getModelFactory, invokeJudge } from '../investigation/judges';
import type { JudgeDeps } from '../investigation/judges';
import { composeAnswerText } from '../investigation/judges/scoring';
import {
  applyCitationRule,
  CAUSAL_STRATEGY_IDS,
  checklistScore,
  EVIDENCE_FAMILIES,
  type StrategyStatus,
} from './strategies';

type RecoveryEvaluator = Evaluator<InvestigationExample, InvestigationTaskOutput>;
type Evidence = Parameters<typeof renderRound>[0];

export const CAUSAL_CHECKLIST_EVALUATOR = 'causal_checklist';
export const ROOT_CAUSE_EVIDENCE_EVALUATOR = 'root_cause_evidence';
export const EVIDENCE_FAMILIES_EVALUATOR = 'evidence_families';

/**
 * Chat threads and incident records are forbidden to these runs by the `customer0-recovery`
 * guardrail, so reaching them must not raise the score. Production may read them, so the online
 * judge counts the family.
 */
const OFFLINE_FAMILIES = EVIDENCE_FAMILIES.filter(({ id }) => id !== 'chat_or_incident_records');

const NO_REPORT_EXPLANATION = 'The investigation recorded no report, so there is nothing to audit.';

/**
 * The round as the online judges read it, so the same prompts score both: the recovery request, each
 * tool call with its arguments and result (the first and last are kept when they do not fit), and
 * the final answer. A round with no tool calls is a round that skipped every tool-backed check, and
 * is scored as one.
 */
const toEvidence = (output: InvestigationTaskOutput): Evidence | undefined => {
  const answer = composeAnswerText(output.structured_report);
  if (!answer) return undefined;
  return {
    input: { message: output.query },
    steps: (output.tool_call_trajectory ?? []).map(({ tool_id: toolId, params, result }) => ({
      tool_id: toolId,
      arguments: params,
      result,
    })),
    response: { message: answer },
  };
};

const earlierAnswers = (input: InvestigationExample['input']): string =>
  typeof input.prior_response === 'string'
    ? `Round 1:\n${input.prior_response}`
    : '(not available)';

export const createCausalChecklistEvaluator = (deps: JudgeDeps): RecoveryEvaluator => ({
  name: CAUSAL_CHECKLIST_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ input, output }) => {
    const evidence = toEvidence(output);
    if (!evidence) return { score: null, label: 'n/a', explanation: NO_REPORT_EXPLANATION };
    const raw = await invokeJudge<unknown>(
      deps,
      CAUSAL_CHECKLIST_EVALUATOR,
      recoveryChecklistPrompt,
      { earlier_answers: earlierAnswers(input), transcript: renderRound(evidence) },
      RECOVERY_CHECKLIST_TOOL_NAME
    );
    const result = recoveryChecklistOutputSchema.parse(raw);
    const { statuses, uncited } = applyCitationRule(result.strategies, evidence.steps.length);
    const count = (wanted: StrategyStatus) =>
      Object.values(statuses).filter((status) => status === wanted).length;
    const notRun = CAUSAL_STRATEGY_IDS.filter((id) => statuses[id] === 'not_run');
    return {
      score: checklistScore(statuses),
      label: `${count('ran')} ran / ${count('blocked')} blocked / ${count('not_run')} not run`,
      explanation: `${result.summary} Not run: ${notRun.join(', ') || 'none'}.${
        uncited.length > 0 ? ` Claimed without a cited tool call: ${uncited.join(', ')}.` : ''
      }`,
      metadata: {
        strategy_status: statuses,
        tags: strategyTags(statuses),
        // The call and the evidence behind each strategy, so a reviewer can audit the credit.
        strategies: result.strategies,
      },
    };
  },
});

export const createRootCauseEvidenceEvaluator = (deps: JudgeDeps): RecoveryEvaluator => ({
  name: ROOT_CAUSE_EVIDENCE_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ output }) => {
    const evidence = toEvidence(output);
    if (!evidence) return { score: null, label: 'n/a', explanation: NO_REPORT_EXPLANATION };
    const raw = await invokeJudge<unknown>(
      deps,
      ROOT_CAUSE_EVIDENCE_EVALUATOR,
      recoveryRootCausePrompt,
      { transcript: renderRound(evidence) },
      RECOVERY_ROOT_CAUSE_TOOL_NAME
    );
    // The schema snaps each evidence score to 0, 0.5 or 1.
    const result = recoveryRootCauseOutputSchema.parse(raw);
    const mechanism = result.mechanism_evidenced;
    const closure = result.closure_evidenced;
    return {
      score: (mechanism + closure) / 2,
      label: result.unsupported_claim ? 'unsupported_claim' : 'supported',
      explanation: `mechanism (${mechanism}): ${result.mechanism_claim}. closure (${closure}): ${result.closure_claim}. ${result.reasoning}`,
      metadata: {
        mechanism_evidenced: mechanism,
        mechanism_level: evidenceLevel(mechanism),
        closure_evidenced: closure,
        closure_level: evidenceLevel(closure),
        unsupported_claim: result.unsupported_claim,
      },
    };
  },
});

const familiesPrompt = createEvidenceFamiliesPrompt(OFFLINE_FAMILIES);

export const createEvidenceFamiliesEvaluator = (deps: JudgeDeps): RecoveryEvaluator => ({
  name: EVIDENCE_FAMILIES_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ output }) => {
    const evidence = toEvidence(output);
    if (!evidence) return { score: null, label: 'n/a', explanation: NO_REPORT_EXPLANATION };
    const total = OFFLINE_FAMILIES.length;
    if (evidence.steps.length === 0) {
      return {
        score: 0,
        label: `0/${total} families`,
        explanation: 'The round made no tool calls.',
        metadata: { families: [] },
      };
    }
    const raw = await invokeJudge<unknown>(
      deps,
      EVIDENCE_FAMILIES_EVALUATOR,
      familiesPrompt,
      { transcript: renderRound(evidence) },
      RECOVERY_EVIDENCE_FAMILIES_TOOL_NAME
    );
    const reached = queriedFamilies(
      recoveryEvidenceFamiliesOutputSchema.parse(raw),
      OFFLINE_FAMILIES,
      evidence.steps.length
    );
    return {
      score: reached.length / total,
      label: `${reached.length}/${total} families`,
      explanation: `Queried: ${reached.join(', ') || 'none'}.`,
      metadata: { families: reached },
    };
  },
});

export const createRecoveryEvaluators = (deps: JudgeDeps): RecoveryEvaluator[] => [
  createCausalChecklistEvaluator(deps),
  createRootCauseEvidenceEvaluator(deps),
  createEvidenceFamiliesEvaluator(deps),
];

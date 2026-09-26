/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';

/**
 * LLM-as-judge prompts ported from Elastic's private `deductive` repo (commit
 * 7d0cc814fe19374e80300e32d1dd8e0bd659fde1):
 * - goal_pass            <- `llm_tasks/golden_goal_evaluation.py` (`GoldenGoalEvaluationTask`,
 *                            INVESTIGATION_RUBRIC, 1-5 scale).
 * - rca_cause_completeness <- `golden_ci/investigation_rewards.py` (`InvestigationRewardScores`,
 *                            `cause_completeness_score`).
 * - rca_anti_leakage     <- `golden_ci/investigation_rewards.py`
 *                            (`InvestigationRewardScores.used_post_incident_evidence`).
 *
 * The rubric wording is preserved verbatim; the transport is adapted to a single Kibana
 * inference tool call whose arguments carry the structured verdict.
 */

const INVESTIGATION_RUBRIC = `## Reward Function (1-5 scale, aligned with Overall Helpfulness)

Score the agent's response against the reference mechanism using this reward function:

**5 — Found the root cause.** The response pinpoints the exact root cause mechanism matching or supersetting the reference, with supporting evidence (timing, logs, config, metrics). A specific mechanism that explains a generic reference label is a valid superset, not a contradiction.

**4 — Very close / related to the root cause.** The response identifies the right subsystem and a mechanism compatible with the reference. It may lack the final hop or one piece of evidence, but a reasonable on-call reviewer would agree it captures the same root cause.

**3 — Got a few significant details right.** Several relevant symptoms, timelines, or components are identified, but the primary cause is not pinpointed or is only partially compatible with the reference mechanism.

**2 — Got a few minor details right.** Plausible but off-target domain (right cluster, wrong service) or vague correlations. A few details happen to be correct but the overall direction is unhelpful.

**1 — Misleading / Factually incorrect.** Wrong root cause, irrelevant symptoms, or analysis that would send the team down a blind alley. Materially contradicts the reference mechanism.

### Superset compatibility
If the reference uses a generic or shorthand label (e.g., "service blip", "argo blip", "deployment + config change") and the response provides a more specific, evidence-backed mechanism that explains the reference (e.g., identifying the specific trigger, component, or sequence behind the generic label), treat the response as COMPATIBLE — score 4 or 5 depending on evidence quality. A specific mechanism that explains the reference is a valid superset, not a contradiction.

### Evaluation guidance
- If ranked hypotheses are present, score based on the best-matching hypothesis, regardless of its rank position.
- Exact wording is NOT required; synonymous or equivalent mechanism phrasing is acceptable.
- Broad class-only similarity (e.g., "dependency issue" when the reference is a specific rollout) is insufficient for score 4+.
- Incident timeline declarations (INCIDENT_DECLARED / PEV descriptions) are secondary context only, not primary-cause evidence.
- Do not penalize detailed responses if the primary cause remains clear and actionable.
- Uncertainty handled explicitly and responsibly (e.g., "most likely cause" + limitations) is acceptable if the most-likely cause is reference-compatible.`;

const GOAL_PASS_SYSTEM = `You are evaluating whether an AI agent achieved the primary goal of a golden CI test.

## Test Context
- User Query: {{{question}}}
- Test Category: {{{category}}}

## Reference Answer
{{{reference}}}

${INVESTIGATION_RUBRIC}

## Output format
Call the \`score\` tool with:
- score: integer 1-5 per the reward function above
- summary: concise reasoning for the score (2-3 sentences)`;

const GOAL_PASS_USER = `## Agent Trajectory
{{{evidence}}}

## Final Response
{{{answer}}}

Evaluate the response against the reference and call the \`score\` tool.`;

export const GoalPassJudgePrompt = createPrompt({
  name: 'nightshift_goal_pass_judge',
  description:
    'Deductive golden goal (goal_pass) judge, 1-5 reward against the reference mechanism.',
  input: z.object({
    question: z.string(),
    reference: z.string(),
    category: z.string(),
    answer: z.string(),
    evidence: z.string(),
  }),
})
  .version({
    system: { mustache: { template: GOAL_PASS_SYSTEM } },
    template: { mustache: { template: GOAL_PASS_USER } },
    tools: {
      score: {
        description: 'Return the 1-5 goal reward score and a short summary.',
        schema: {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              description:
                'Reward score on a 1-5 scale (1 = misleading, 5 = found the root cause).',
            },
            summary: { type: 'string', description: 'Concise reasoning for the score.' },
          },
          required: ['score', 'summary'],
        },
      },
    },
  } as const)
  .get();

const MECHANISM_CLASSES = [
  'false_positive',
  'deployment',
  'config_change',
  'traffic_surge',
  'transient_blip',
  'combined_cause',
  'infrastructure_fault',
  'incident_link',
  'capacity_pressure',
  'experiment_artifact',
  'unknown',
] as const;

const CAUSE_COMPLETENESS_SYSTEM = `You are a reward-model evaluator for an AI alert-investigation system.
Your job is to score the agent's investigation answer across multiple reward dimensions.

Mechanism classes (use exactly one per answer):
${MECHANISM_CLASSES.join(', ')}

Definitions:
- false_positive: alert fired but metric is actually normal / no real issue
- deployment: a code/image/artifact deploy caused the incident
- config_change: a runtime config, feature flag, or kill-switch change caused it
- traffic_surge: organic or load-test traffic increase caused it
- transient_blip: short-lived spike with no identifiable cause
- combined_cause: two or more independent causes together caused it
- infrastructure_fault: hardware, JVM GC storm, OOM, disk, network issue
- incident_link: alert is a symptom of a separately-declared incident
- capacity_pressure: sustained demand exceeding capacity (not a single deploy)
- experiment_artifact: a Z-score / WoW comparison anomaly caused by an experiment affecting the baseline
- unknown: cannot determine from available evidence

Reference answer: {{{reference}}}
Query: {{{question}}}

Score cause completeness as follows:
- When is_combined_cause=true: fraction of reference sub-causes found in the agent answer (0.0-1.0).
- When is_combined_cause=false: 1.0 if the primary cause matches the reference, 0.0 otherwise.`;

const CAUSE_COMPLETENESS_USER = `Agent trajectory (evidence gathered, truncated):
{{{evidence}}}

Agent final answer:
{{{answer}}}

Call the \`score\` tool with the mechanism classes, whether the reference is a combined cause, and the cause completeness score.`;

export const CauseCompletenessJudgePrompt = createPrompt({
  name: 'nightshift_rca_cause_completeness_judge',
  description:
    'Deductive rca_cause_completeness judge: fraction of reference sub-causes identified.',
  input: z.object({
    question: z.string(),
    reference: z.string(),
    answer: z.string(),
    evidence: z.string(),
  }),
})
  .version({
    system: { mustache: { template: CAUSE_COMPLETENESS_SYSTEM } },
    template: { mustache: { template: CAUSE_COMPLETENESS_USER } },
    tools: {
      score: {
        description: 'Return the mechanism classes and the cause completeness score.',
        schema: {
          type: 'object',
          properties: {
            reference_mechanism_class: {
              type: 'string',
              enum: MECHANISM_CLASSES as unknown as string[],
              description: 'Mechanism class of the REFERENCE answer.',
            },
            agent_mechanism_class: {
              type: 'string',
              enum: MECHANISM_CLASSES as unknown as string[],
              description: 'Mechanism class of the AGENT answer.',
            },
            is_combined_cause: {
              type: 'boolean',
              description: 'True if the reference requires multiple independent causes.',
            },
            cause_completeness_score: {
              type: 'number',
              description: 'Fraction of reference sub-causes found (0.0-1.0).',
            },
            reasoning: { type: 'string', description: 'One sentence justifying the score.' },
          },
          required: [
            'reference_mechanism_class',
            'agent_mechanism_class',
            'is_combined_cause',
            'cause_completeness_score',
            'reasoning',
          ],
        },
      },
    },
  } as const)
  .get();

const ANTI_LEAKAGE_SYSTEM = `You are a reward-model evaluator for an AI alert-investigation system.
Assess whether the agent's investigation leaked post-incident information.

An investigation must reach its root cause from evidence available AT investigation time. It is a
leakage violation to cite post-incident resolution text, INCIDENT_DECLARED declarations, PEV titles,
or mitigation/resolution notes as PRIMARY causal evidence — that information would not have been
available while the incident was unfolding.

Set used_post_incident_evidence=true only when such post-incident/resolution text is used as primary
causal evidence for the conclusion. Merely mentioning that an incident was later resolved, without
relying on it to establish the cause, is not a violation.`;

const ANTI_LEAKAGE_USER = `Agent trajectory (evidence gathered, truncated):
{{{evidence}}}

Agent final answer:
{{{answer}}}

Call the \`score\` tool with your leakage verdict.`;

export const AntiLeakageJudgePrompt = createPrompt({
  name: 'nightshift_rca_anti_leakage_judge',
  description:
    'Deductive rca_anti_leakage judge: did the agent use post-incident text as evidence.',
  input: z.object({
    answer: z.string(),
    evidence: z.string(),
  }),
})
  .version({
    system: { mustache: { template: ANTI_LEAKAGE_SYSTEM } },
    template: { mustache: { template: ANTI_LEAKAGE_USER } },
    tools: {
      score: {
        description: 'Return whether post-incident resolution text was used as primary evidence.',
        schema: {
          type: 'object',
          properties: {
            used_post_incident_evidence: {
              type: 'boolean',
              description:
                'True if post-incident/resolution text was used as primary causal evidence.',
            },
            reasoning: {
              type: 'string',
              description: 'One sentence: what post-incident evidence was used (if any).',
            },
          },
          required: ['used_post_incident_evidence', 'reasoning'],
        },
      },
    },
  } as const)
  .get();

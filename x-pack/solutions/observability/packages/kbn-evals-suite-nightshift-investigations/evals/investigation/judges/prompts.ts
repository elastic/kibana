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

## Reference Answer
{{{reference}}}

${INVESTIGATION_RUBRIC}

## Output format
Call the \`score\` tool with:
- score: integer 1-5 per the reward function above
- summary: concise reasoning for the score (2-3 sentences)`;

const GOAL_PASS_USER = `## Final Response
{{{answer}}}

Evaluate the response against the reference and call the \`score\` tool.`;

export const GoalPassJudgePrompt = createPrompt({
  name: 'nightshift_goal_pass_judge',
  description:
    'Deductive golden goal (goal_pass) judge, 1-5 reward against the reference mechanism.',
  input: z.object({
    question: z.string(),
    reference: z.string(),
    answer: z.string(),
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

const CAUSE_COMPLETENESS_USER = `Agent trajectory (evidence gathered):
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

const TRUTHFULNESS_SYSTEM = `You are a reward-model evaluator for an AI alert-investigation system.
Assess the TRUTHFULNESS of the agent's investigation, defined as evidence-groundedness: are there
CLEAR, concrete EVIDENCES in the report that point to / support the root cause the agent suggested?

This is a reference-FREE judgement over the investigation's OWN output. Do NOT compare against any
ground-truth answer or your own opinion of the true cause. Judge only whether the stated root
cause / conclusion is actually backed by the specific evidence the report presents (metrics, logs,
config, timing, ES|QL results, correlated signals) versus asserting a conclusion without support.

## Query (context only)
{{{question}}}

## Scoring (1-5 scale)
- 5 — Fully grounded. The stated root cause is directly supported by clear, specific, concrete
  evidence in the report; a reviewer can trace the conclusion back to named signals.
- 4 — Well grounded. Solid supporting evidence for the root cause, with a minor gap or one
  under-substantiated link.
- 3 — Partially grounded. Some relevant evidence is present, but key parts of the stated root cause
  rest on assertion, correlation-without-causation, or hand-waving.
- 2 — Weakly grounded. Mostly assertion; evidence is vague, generic, or does not clearly connect to
  the stated cause.
- 1 — Ungrounded. The conclusion is asserted with no clear evidence that supports it (or the cited
  evidence contradicts / is unrelated to the stated cause).

### Guidance
- Reward concrete, specific evidence tied to the conclusion; penalize confident conclusions that
  lack supporting evidence.
- More prose is not more evidence — judge whether the evidence actually substantiates the CAUSE.
- If ranked hypotheses are present, judge the evidence behind the primary/most-confident hypothesis
  that forms the conclusion.

## Output format
Call the \`score\` tool with:
- score: integer 1-5 per the scale above
- summary: concise reasoning citing which evidence did or did not support the stated root cause.`;

const TRUTHFULNESS_USER = `## Investigation report (conclusion, hypotheses, recommendations)
{{{answer}}}

## Supporting evidence (per-hypothesis evidence and recommendations)
{{{evidence}}}

Judge how well CLEAR evidence in the report supports the suggested root cause, then call the
\`score\` tool.`;

export const TruthfulnessJudgePrompt = createPrompt({
  name: 'nightshift_truthfulness_judge',
  description:
    'Reference-free truthfulness judge: does clear evidence in the report support the stated root cause.',
  input: z.object({
    question: z.string(),
    answer: z.string(),
    evidence: z.string(),
  }),
})
  .version({
    system: { mustache: { template: TRUTHFULNESS_SYSTEM } },
    template: { mustache: { template: TRUTHFULNESS_USER } },
    tools: {
      score: {
        description:
          'Return the 1-5 truthfulness (evidence-groundedness) score and a short summary.',
        schema: {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              description:
                'Evidence-groundedness score on a 1-5 scale (1 = ungrounded assertion, 5 = fully evidence-backed root cause).',
            },
            summary: { type: 'string', description: 'Concise reasoning for the score.' },
          },
          required: ['score', 'summary'],
        },
      },
    },
  } as const)
  .get();

const DECISION_TREE_CONTRIBUTION_TYPES = [
  'guided_root_cause',
  'ruled_out_branch',
  'provided_diagnostic_steps',
  'confirmed_hypothesis',
  'contradicted',
  'ignored',
] as const;

const DECISION_TREE_HELPFULNESS_SYSTEM = `You are a reward-model evaluator for an AI alert-investigation system.
Judge whether the decision tree(s) the agent opened during this investigation actually helped it,
and how. A decision tree is a curated markdown playbook for a specific symptom, encoding prior
on-call diagnostic knowledge: candidate root causes, the checks that distinguish between them, and
known false-positive patterns. Opening a tree is not itself helpful — it only helped if its guidance
is visible in the investigation's actual evidence gathering or reasoning (e.g. the agent ran a check
the tree recommended, ruled out a branch the tree describes, or the tree's checklist shaped which
hypothesis it pursued).

## Query (context only)
{{{question}}}

## Decision tree(s) opened during the investigation
{{{decisionTrees}}}

## Scoring (1-5 scale)
- 5 — The tree's guidance is clearly followed and decisive: a specific check, branch, or hypothesis
  from the tree maps directly onto the evidence gathered and the stated conclusion.
- 4 — The tree meaningfully shaped the investigation (e.g. ruled out a branch, or suggested a check
  the agent then ran), even if it was not the sole driver of the final conclusion.
- 3 — The tree was consulted and loosely related to what the agent did, but its specific guidance is
  not clearly traceable in the evidence or the conclusion.
- 2 — The tree was opened but the investigation proceeded largely independently of it; any overlap
  looks coincidental.
- 1 — The tree was opened but ignored, or the investigation's conclusion contradicts guidance the
  tree gives.

### Contribution type
Pick the single best label for how the tree affected the investigation (${DECISION_TREE_CONTRIBUTION_TYPES.join(
  ', '
)}):
- guided_root_cause: the tree's mapping from symptom to cause matches the stated conclusion
- ruled_out_branch: the agent used the tree to eliminate a candidate cause
- provided_diagnostic_steps: the agent ran a check or query the tree recommended
- confirmed_hypothesis: the tree corroborated a hypothesis reached from other evidence
- contradicted: the investigation's conclusion conflicts with the tree's guidance
- ignored: the tree was opened but had no visible effect on the investigation

## Output format
Call the \`score\` tool with:
- was_helpful: true if the tree meaningfully influenced the investigation (a score of 3+ implies true)
- helpfulness_score: integer 1-5 per the scale above
- contribution_type: one of the labels above
- reasoning: 1-2 sentences citing which tree step or branch maps to which evidence or conclusion`;

const DECISION_TREE_HELPFULNESS_USER = `## Investigation report (conclusion, hypotheses, recommendations)
{{{answer}}}

## Evidence gathered during the investigation
{{{evidence}}}

Judge whether the decision tree(s) above helped this investigation, then call the \`score\` tool.`;

export const DecisionTreeHelpfulnessJudgePrompt = createPrompt({
  name: 'nightshift_decision_tree_helpfulness_judge',
  description:
    'decision_tree_helpfulness judge: did the decision tree(s) the agent opened help the investigation, and how.',
  input: z.object({
    question: z.string(),
    decisionTrees: z.string(),
    answer: z.string(),
    evidence: z.string(),
  }),
})
  .version({
    system: { mustache: { template: DECISION_TREE_HELPFULNESS_SYSTEM } },
    template: { mustache: { template: DECISION_TREE_HELPFULNESS_USER } },
    tools: {
      score: {
        description: 'Return whether the decision tree(s) helped, how, and the helpfulness score.',
        schema: {
          type: 'object',
          properties: {
            was_helpful: {
              type: 'boolean',
              description: 'True if the tree meaningfully influenced the investigation.',
            },
            helpfulness_score: {
              type: 'number',
              description:
                'Helpfulness score on a 1-5 scale (1 = ignored/contradicted, 5 = clearly followed and decisive).',
            },
            contribution_type: {
              type: 'string',
              enum: DECISION_TREE_CONTRIBUTION_TYPES as unknown as string[],
              description: 'How the tree affected the investigation.',
            },
            reasoning: { type: 'string', description: 'Concise reasoning for the score.' },
          },
          required: ['was_helpful', 'helpfulness_score', 'contribution_type', 'reasoning'],
        },
      },
    },
  } as const)
  .get();

const ANTI_LEAKAGE_SYSTEM = `You are a reward-model evaluator for an AI alert-investigation system.
Your job is to decide whether ANY evidence the agent accessed LEAKS the root cause of the incident.

A legitimate investigation must reach the root cause by reasoning over signals available AT
investigation time (metrics, logs, traces, config, deploys, correlated anomalies). It is LEAKAGE
when the agent instead accessed an authoritative or post-hoc source that simply reveals the answer,
so that the conclusion is handed to the agent rather than derived from investigation-time evidence.

Look through the evidence the agent accessed and flag it as leakage if it includes any of:
(a) incident-management system entries that contain a human-applied root-cause label, resolution, or
    remediation for THIS incident (e.g. an incident/case record stating the cause or the fix);
(b) Slack / chat / ticket discussions about the same incident where humans state or debate the cause;
(c) ANY data or evidence timestamped AFTER the alert was documented as resolved — post-resolution
    information of any kind, including post-incident reviews, PEV / post-event verification notes,
    mitigation or rollback-completed notes, and retrospective write-ups.

Set leaked_root_cause=true if any accessed evidence constitutes such a leak of the root cause.
Set leaked_root_cause=false when the accessed evidence consists only of investigation-time signals
that the agent would have to reason over to reach the cause. Merely mentioning that an incident was
later resolved, without accessing a source that gives away the cause, is not by itself a leak.`;

const ANTI_LEAKAGE_USER = `## Question
{{{question}}}

## Evidence the agent accessed
{{{evidence}}}

Judge whether any accessed evidence leaks the root cause, then call the \`score\` tool.`;

export const AntiLeakageJudgePrompt = createPrompt({
  name: 'nightshift_rca_anti_leakage_judge',
  description:
    'rca_anti_leakage judge: did the agent access a source that leaks the incident root cause.',
  input: z.object({
    question: z.string(),
    evidence: z.string(),
  }),
})
  .version({
    system: { mustache: { template: ANTI_LEAKAGE_SYSTEM } },
    template: { mustache: { template: ANTI_LEAKAGE_USER } },
    tools: {
      score: {
        description: 'Return whether any accessed evidence leaks the incident root cause.',
        schema: {
          type: 'object',
          properties: {
            leaked_root_cause: {
              type: 'boolean',
              description:
                'True if any accessed evidence leaks the root cause (authoritative/post-hoc source).',
            },
            reasoning: {
              type: 'string',
              description: 'One sentence: which accessed evidence leaked the root cause (if any).',
            },
          },
          required: ['leaked_root_cause', 'reasoning'],
        },
      },
    },
  } as const)
  .get();

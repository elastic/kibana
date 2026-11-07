/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import orcaInstructionsText from './report_prompt/orca_instructions.text';
import { JUDGE_OUTPUT_SCHEMA } from './check_prediction';

const renderedPromptInput = lazySchema(() => z.object({ prompt: z.string() }));

/**
 * ORCA's judge output schema as a tool schema. The inference API accepts only `type`,
 * `properties` and `required` at a tool schema's top level, so the top-level
 * `additionalProperties: false` is left out; nested schemas keep theirs. `ToolSchema` has no
 * `integer` type, which the per-rubric `score` uses.
 */
const ORCA_JUDGE_TOOL_SCHEMA = {
  type: 'object',
  properties: JUDGE_OUTPUT_SCHEMA.properties,
  required: JUDGE_OUTPUT_SCHEMA.required,
} as unknown as ToolSchema;

/**
 * ORCA's incident judge. The prompt is `build_judge_prompt`'s output, rendered by the port in
 * `check_prediction.ts`; the answer comes through the `score` tool with ORCA's output schema.
 */
export const OrcaIncidentJudgePrompt = createPrompt({
  name: 'nightshift_orca_incident_judge',
  description: "ORCA's incident judge: per-rubric verdicts and a 0-3 score for an RCA report.",
  input: renderedPromptInput,
})
  .version({
    template: { mustache: { template: '{{{prompt}}}' } },
    tools: {
      score: {
        description: 'Return one verdict per rubric, in rubric order.',
        schema: ORCA_JUDGE_TOOL_SCHEMA,
      },
    },
  } as const)
  .get();

/**
 * ORCA's control judge. The prompt is `JUDGE_PROMPT_CONTROL` as the port renders it. The tool asks
 * for the reasoning before the decision: with the decision first, the judge committed before
 * comparing the times and its own reasoning often contradicted it.
 */
export const OrcaControlJudgePrompt = createPrompt({
  name: 'nightshift_orca_control_judge',
  description: "ORCA's control judge: whether a report places an incident inside the quiet window.",
  input: renderedPromptInput,
})
  .version({
    template: { mustache: { template: '{{{prompt}}}' } },
    tools: {
      score: {
        description: 'Return whether the report claims an incident inside the quiet window.',
        schema: {
          type: 'object',
          properties: {
            reasoning: {
              type: 'string',
              description:
                'Compare each reported time of active impact with the window bounds, then state the verdict.',
            },
            claims_incident_in_quiet_window: { type: 'boolean' },
          },
          required: ['reasoning', 'claims_incident_in_quiet_window'],
        },
      },
    },
  } as const)
  .get();

/**
 * What counts as an incident, for the report writer's empty-or-not decision and for the fidelity
 * judge. ORCA asks "whether an incident actually occurred", not whether the reported symptom was
 * confirmed, and leaves the threshold to the agent.
 */
const ORCA_INCIDENT_DEFINITION = `An incident is a period in which requests failed or slowed down and the investigation treated it as a problem: it described the impact, when it happened, or its cause. That holds even when the investigation judged it outside the reported window, already over, or unrelated to the reported symptom. Isolated errors the investigation dismissed as noise, such as a single failed request, scanner 404s or start-up warm-up, are not an incident.`;

const ORCA_REPORT_SYSTEM = `You are the SRE agent that ran the investigation below. The investigation has ended. Write its incident RCA report from its record.

Rules:
- Use only what the investigation record contains: its verdict, summary, hypotheses and their evidence, impact, proposed actions, and the tool calls it made with their results. Do not add a root cause, contributing cause, incident, time window, time, number, query or trace ID that the record does not contain.
- The root cause is what the investigation concluded, stated with the confidence it stated. A hypothesis the investigation rejected is not a root cause, and a correlation it reported stays a correlation.
- The 5 Whys may end at the investigation's own finding. When the record does not establish a further process or system gap, such as a missing timeout, fallback, alert or guard, stop the chain there and note what evidence would be needed to continue. Such ideas belong only under Remediation.
- The investigation queried Elasticsearch with ES|QL. Where a section rule asks for a PromQL or Lucene query, give the ES|QL query the investigation ran, exactly as it ran it.
- ${ORCA_INCIDENT_DEFINITION} If the investigation found one, write the report about it and name the cause the investigation gave it.
- Return an empty report only when the investigation found no incident.
- Call the \`write_report\` tool.

${orcaInstructionsText}`;

const ORCA_REPORT_USER = `## Task Description

{{{question}}}

## Investigation record

{{{investigation}}}

## Tool calls and results

{{{trajectory}}}`;

/** Turns a finished investigation into ORCA's four-section `report.md`, with the model under test. */
export const OrcaReportPrompt = createPrompt({
  name: 'nightshift_orca_report',
  description: "Writes ORCA's report.md from a finished investigation's record.",
  input: lazySchema(() =>
    z.object({ question: z.string(), investigation: z.string(), trajectory: z.string() })
  ),
})
  .version({
    system: ORCA_REPORT_SYSTEM,
    template: { mustache: { template: ORCA_REPORT_USER } },
    tools: {
      write_report: {
        description: 'Return the incident RCA report.',
        schema: {
          type: 'object',
          properties: {
            incident_occurred: {
              type: 'boolean',
              description: 'Whether the investigation found an incident, as the rules define it.',
            },
            report: {
              type: 'string',
              description:
                'The report as markdown, with the four sections. Empty only when no incident occurred.',
            },
          },
          required: ['incident_occurred', 'report'],
        },
      },
    },
  } as const)
  .get();

const ORCA_REPORT_FIDELITY_SYSTEM = `You check that an incident RCA report was written faithfully from the investigation it summarizes. The report was written after the investigation ended, from the investigation's record alone, and must not change its findings.`;

const ORCA_REPORT_FIDELITY_USER = `## Task description given to the investigation
{{{question}}}

## Investigation record
{{{investigation}}}

## Report
{{{report}}}

${ORCA_INCIDENT_DEFINITION}

Call the \`score\` tool with:
- reasoning: compare the report's root cause, contributing causes and incident verdict with the investigation's, and name any mismatch.
- unsupported_causes: every root cause or contributing cause the report asserts that the investigation's verdict, summary and hypotheses do not, including a process or system gap (a missing timeout, fallback, alert or guard) the investigation did not establish, and a correlation the report presents as an established cause. Remediation recommendations, causes listed only as unexplored branches, and facts taken from the task description do not count. An empty list is valid.
- verdict_preserved: false when the report is empty although the investigation found an incident, or when the report describes an incident or time window the investigation did not find; otherwise true.`;

/** Whether ORCA's generated report.md adds or drops causes relative to the investigation. */
export const OrcaReportFidelityJudgePrompt = createPrompt({
  name: 'nightshift_orca_report_fidelity_judge',
  description: 'Checks that a generated report.md names no root cause the investigation did not.',
  input: lazySchema(() =>
    z.object({ question: z.string(), investigation: z.string(), report: z.string() })
  ),
})
  .version({
    system: ORCA_REPORT_FIDELITY_SYSTEM,
    template: { mustache: { template: ORCA_REPORT_FIDELITY_USER } },
    tools: {
      score: {
        description: 'Return whether the report is faithful to the investigation.',
        schema: {
          type: 'object',
          properties: {
            reasoning: { type: 'string' },
            unsupported_causes: { type: 'array', items: { type: 'string' } },
            verdict_preserved: { type: 'boolean' },
          },
          required: ['reasoning', 'unsupported_causes', 'verdict_preserved'],
        },
      },
    },
  } as const)
  .get();

const ORCA_FLAGS_SYSTEM = `You extract root causes from an investigation report.

## Plausible feature flags
{{{plausibleFlags}}}

## Reference
{{{reference}}}

Call the \`score\` tool with:
- named_flags: every plausible flag the report names as a cause. Use the key from the list. Append \`:variant\` only when the report states a variant. A key without a variant still counts. An empty list is valid.
- named_causes: every root cause the report asserts, including flags that are not in the list. Use \`key\` or \`key:variant\` for a feature flag; otherwise use the report's wording.
- reasoning: one sentence.`;

const ORCA_FLAGS_USER = `## Report
{{{answer}}}

Call the \`score\` tool.`;

/**
 * The earlier flag extraction behind `orca_flags_rca_accuracy` and `orca_flags_hallucination`, kept
 * for comparison with the ported judge (`NIGHTSHIFT_ORCA_LEGACY_JUDGES`).
 */
export const OrcaFlagsJudgePrompt = createPrompt({
  name: 'nightshift_orca_flags_judge',
  description:
    'Extracts the feature flags and other causes an ORCA report names. Scoring is applied in code.',
  input: lazySchema(() =>
    z.object({
      plausibleFlags: z.string(),
      reference: z.string(),
      answer: z.string(),
    })
  ),
})
  .version({
    system: { mustache: { template: ORCA_FLAGS_SYSTEM } },
    template: { mustache: { template: ORCA_FLAGS_USER } },
    tools: {
      score: {
        description: 'Return the flags and causes the report names.',
        schema: {
          type: 'object',
          // `reasoning` comes first so the lists follow from it, as in the control judge.
          properties: {
            reasoning: { type: 'string', description: 'One sentence.' },
            named_flags: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Plausible flag ids the report names, as key or key:variant when a variant is stated.',
            },
            named_causes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Every root cause the report asserts.',
            },
          },
          required: ['reasoning', 'named_flags', 'named_causes'],
        },
      },
    },
  } as const)
  .get();

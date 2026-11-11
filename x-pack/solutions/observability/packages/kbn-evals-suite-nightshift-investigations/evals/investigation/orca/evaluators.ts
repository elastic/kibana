/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationExample, InvestigationTaskOutput } from '../types';
import type { InvestigationEvaluator, JudgeDeps } from '../judges/invoke_judge';
import { createRunMemo, getModelFactory, invokeJudge } from '../judges/invoke_judge';
import { composeAnswerText } from '../judges/scoring';
import { scoreOrcaHallucination, scoreOrcaRcaAccuracy } from '../judges/orca_scoring';
import type { JsonValue, OrcaAggregate, OrcaJudgeMode, OrcaRubric } from './check_prediction';
import {
  aggregateJudgeResponse,
  buildControlPrompt,
  buildJudgePrompt,
  controlResponse,
  emptyReportResponse,
  isEmptyReport,
  orcaReward,
  parseJudgeResponse,
} from './check_prediction';
import { getOrcaExpected, getOrcaRubrics } from './rubrics';
import {
  OrcaControlJudgePrompt,
  OrcaFlagsJudgePrompt,
  OrcaIncidentJudgePrompt,
  OrcaReportFidelityJudgePrompt,
} from './prompts';
import {
  composeOrcaInvestigationText,
  orcaAgentFailure,
  orcaReportUnscoredReason,
  orcaRunUnscoredReason,
  reportHasFindings,
} from './report';

export const ORCA_RCA_ACCURACY_EVALUATOR = 'orca_rca_accuracy';
export const ORCA_RCA_DEPTH_EVALUATOR = 'orca_rca_depth';
export const ORCA_HALLUCINATION_EVALUATOR = 'orca_hallucination';
export const ORCA_CONTROL_EVALUATOR = 'orca_control';
export const ORCA_REPORT_FIDELITY_EVALUATOR = 'orca_report_fidelity';
export const ORCA_FLAGS_RCA_ACCURACY_EVALUATOR = 'orca_flags_rca_accuracy';
export const ORCA_FLAGS_HALLUCINATION_EVALUATOR = 'orca_flags_hallucination';

type Metadata = InvestigationExample['metadata'];

/** How ORCA's verifier graded one run's `report.md`. */
type OrcaGrade =
  | { status: 'n/a'; explanation: string }
  | { status: 'unscored'; explanation: string }
  | {
      status: 'scored';
      control: boolean;
      mode: OrcaJudgeMode;
      aggregate: OrcaAggregate;
      explanation: string;
      /** Set when the agent failed and the run is scored as having no report. */
      agentFailure?: string;
    };

const unscored = (reason: string): OrcaGrade => ({
  status: 'unscored',
  explanation: `ORCA does not score this run: ${reason}`,
});

const describeVerdicts = ({ per_rubric: perRubric }: OrcaAggregate): string =>
  perRubric
    .map(
      (rubric) =>
        `${rubric.feature_flag}: ${rubric.score}/3 (flag ${
          rubric.feature_flag_match ? 'named' : 'missed'
        }, mechanism ${rubric.mechanism_match ? 'matched' : 'missed'}, onset ${
          rubric.incident_time_within_10min ? 'within' : 'outside'
        } 10 min)`
    )
    .join('; ');

/** ORCA's `judge(...)` for one run: the control or incident judge, or its no-LLM short-circuits. */
const gradeOrcaReport = async (
  deps: JudgeDeps,
  rubrics: ReadonlyMap<string, OrcaRubric>,
  metadata: Metadata,
  output: InvestigationTaskOutput
): Promise<OrcaGrade> => {
  const expected = getOrcaExpected(metadata);
  if (!expected) {
    return {
      status: 'n/a',
      explanation: 'The task has no ORCA ground truth (metadata.orca_expected).',
    };
  }
  const isControl = expected.events.length === 0;
  const found = isControl ? { rubrics: [] } : getOrcaRubrics(expected, rubrics);
  if ('missing' in found) {
    return {
      status: 'n/a',
      explanation: `No ORCA rubric for ${found.missing.join(', ')}.`,
    };
  }
  const unscoredReason = orcaReportUnscoredReason(output);
  if (unscoredReason) return unscored(unscoredReason);

  const agentFailure = orcaAgentFailure(output);
  if (agentFailure) {
    const explanation = `The agent did not finish (${agentFailure}), so there is no report.md; ORCA's verifier scores such a trial 0.`;
    return isControl
      ? {
          status: 'scored',
          control: true,
          mode: 'no_incident_llm_judge',
          aggregate: aggregateJudgeResponse(controlResponse(true), 'no_incident_llm_judge'),
          explanation,
          agentFailure,
        }
      : {
          status: 'scored',
          control: false,
          mode: 'empty_report',
          aggregate: aggregateJudgeResponse(emptyReportResponse(found.rubrics), 'empty_report'),
          explanation,
          agentFailure,
        };
  }
  const report = output.orca_report_md ?? '';

  if (isControl) {
    if (isEmptyReport(report)) {
      return {
        status: 'scored',
        control: true,
        mode: 'no_incident_llm_judge',
        aggregate: aggregateJudgeResponse(controlResponse(false), 'no_incident_llm_judge'),
        explanation: 'An empty control report passes.',
      };
    }
    const { claims_incident_in_quiet_window: claims, reasoning } = await invokeJudge<{
      claims_incident_in_quiet_window: boolean;
      reasoning: string;
    }>(
      deps,
      ORCA_CONTROL_EVALUATOR,
      OrcaControlJudgePrompt,
      { prompt: buildControlPrompt(expected, report) },
      {
        validate: (args) => {
          if (typeof args?.claims_incident_in_quiet_window !== 'boolean') {
            throw new Error('ORCA control judge returned no window decision');
          }
        },
      }
    );
    return {
      status: 'scored',
      control: true,
      mode: 'no_incident_llm_judge',
      aggregate: aggregateJudgeResponse(controlResponse(claims), 'no_incident_llm_judge'),
      explanation: String(reasoning ?? ''),
    };
  }

  if (isEmptyReport(report)) {
    const aggregate = aggregateJudgeResponse(emptyReportResponse(found.rubrics), 'empty_report');
    return {
      status: 'scored',
      control: false,
      mode: 'empty_report',
      aggregate,
      explanation: 'The report is empty although the task has an incident; every rubric scores 0.',
    };
  }
  const verdicts = await invokeJudge<JsonValue>(
    deps,
    'orca_incident',
    OrcaIncidentJudgePrompt,
    { prompt: buildJudgePrompt(found.rubrics, report) },
    // A malformed answer, or one without a verdict for every rubric, is retried; the verifier
    // relies on structured outputs and the prompt for both.
    {
      validate: (args) => {
        const { rubrics: answered } = parseJudgeResponse(args);
        if (answered.length !== found.rubrics.length) {
          throw new Error(
            `ORCA incident judge returned ${answered.length} verdicts for ${found.rubrics.length} rubrics`
          );
        }
      },
    }
  );
  const aggregate = aggregateJudgeResponse(parseJudgeResponse(verdicts), 'llm_judge');
  return {
    status: 'scored',
    control: false,
    mode: 'llm_judge',
    aggregate,
    explanation: describeVerdicts(aggregate),
  };
};

const notApplicable = (explanation: string) => ({ score: null, label: 'n/a', explanation });

const gradeMetadata = (mode: OrcaJudgeMode, aggregate: OrcaAggregate, agentFailure?: string) => ({
  orca_mode: agentFailure ? 'agent_failure' : mode,
  per_rubric: aggregate.per_rubric.map(
    ({ feature_flag: flag, score, feature_flag_match: flagMatch, mechanism_match: mechanism }) => ({
      feature_flag: flag,
      score,
      feature_flag_match: flagMatch,
      mechanism_match: mechanism,
    })
  ),
  reward: orcaReward(aggregate),
});

/**
 * ORCA's verifier on `orca_report_md`: `orca_rca_accuracy` (every rubric's flag named),
 * `orca_rca_depth` (the paper's reward, mean per-rubric score / 3), `orca_hallucination` (a
 * non-empty report that matched no rubric) and `orca_control`, all from one judge call per run.
 */
const createPortedOrcaEvaluators = (
  deps: JudgeDeps,
  rubrics: ReadonlyMap<string, OrcaRubric>
): InvestigationEvaluator[] => {
  const memo = createRunMemo<OrcaGrade>();
  const grade = (metadata: Metadata, output: InvestigationTaskOutput) =>
    memo(output, () => gradeOrcaReport(deps, rubrics, metadata, output));

  const create = (
    name: string,
    direction: InvestigationEvaluator['direction'],
    appliesTo: 'incident' | 'control',
    score: (aggregate: OrcaAggregate) => { score: number; label: string }
  ): InvestigationEvaluator => ({
    name,
    kind: 'LLM',
    direction,
    getModel: getModelFactory(deps.evaluationConnector),
    evaluate: async ({ output, metadata }) => {
      const expected = getOrcaExpected(metadata);
      if (expected && (expected.events.length === 0) !== (appliesTo === 'control')) {
        return notApplicable(
          appliesTo === 'control'
            ? 'Control applies to a no-incident task.'
            : 'This score applies to an incident, not a control.'
        );
      }
      const result = await grade(metadata, output);
      if (result.status === 'n/a') return notApplicable(result.explanation);
      if (result.status === 'unscored') {
        return { score: null, label: 'unscored', explanation: result.explanation };
      }
      return {
        ...score(result.aggregate),
        explanation: result.explanation,
        metadata: gradeMetadata(result.mode, result.aggregate, result.agentFailure),
      };
    },
  });

  return [
    create(ORCA_RCA_ACCURACY_EVALUATOR, 'maximize', 'incident', ({ rca_accuracy: accuracy }) => ({
      score: accuracy ? 1 : 0,
      label: accuracy ? 'pass' : 'fail',
    })),
    create(ORCA_RCA_DEPTH_EVALUATOR, 'maximize', 'incident', (aggregate) => ({
      score: orcaReward(aggregate),
      label: `${aggregate.rca_depth ?? 0}/3`,
    })),
    create(
      ORCA_HALLUCINATION_EVALUATOR,
      'minimize',
      'incident',
      ({ hallucinate_any: hallucinated }) => ({
        score: hallucinated ? 1 : 0,
        label: hallucinated ? 'hallucinated' : 'pass',
      })
    ),
    create(ORCA_CONTROL_EVALUATOR, 'maximize', 'control', (aggregate) => {
      const passed = orcaReward(aggregate) === 1;
      return { score: passed ? 1 : 0, label: passed ? 'pass' : 'fail' };
    }),
  ];
};

/** Whether the generated `report.md` keeps the investigation's causes and verdict. */
const createReportFidelityEvaluator = (deps: JudgeDeps): InvestigationEvaluator => ({
  name: ORCA_REPORT_FIDELITY_EVALUATOR,
  kind: 'LLM',
  direction: 'maximize',
  getModel: getModelFactory(deps.evaluationConnector),
  evaluate: async ({ output }) => {
    const agentFailure = orcaAgentFailure(output);
    if (agentFailure) {
      return notApplicable(
        `The agent did not finish (${agentFailure}), so no report.md was written.`
      );
    }
    const unscoredReason = orcaReportUnscoredReason(output);
    if (unscoredReason) {
      return {
        score: null,
        label: 'unscored',
        explanation: `ORCA does not score this run: ${unscoredReason}`,
      };
    }
    const report = output.orca_report_md ?? '';
    const result = await invokeJudge<{
      reasoning: string;
      unsupported_causes: string[];
      verdict_preserved: boolean;
    }>(
      deps,
      ORCA_REPORT_FIDELITY_EVALUATOR,
      OrcaReportFidelityJudgePrompt,
      {
        question: output.query,
        investigation: composeOrcaInvestigationText(output.structured_report),
        report: isEmptyReport(report) ? '(empty report)' : report,
      },
      {
        validate: (args) => {
          if (
            !Array.isArray(args?.unsupported_causes) ||
            typeof args.verdict_preserved !== 'boolean'
          ) {
            throw new Error('ORCA report fidelity judge returned no decision');
          }
        },
      }
    );
    const unsupported = result.unsupported_causes.map(String);
    const faithful = unsupported.length === 0 && result.verdict_preserved;
    return {
      score: faithful ? 1 : 0,
      label: faithful
        ? 'faithful'
        : unsupported.length > 0
        ? 'unsupported_cause'
        : 'verdict_changed',
      explanation: String(result.reasoning ?? ''),
      metadata: { unsupported_causes: unsupported, verdict_preserved: result.verdict_preserved },
    };
  },
});

const stringList = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;

const isOrcaControl = (metadata: Metadata): boolean =>
  metadata.control === true ||
  metadata.task_type === 'control' ||
  metadata.no_incident === true ||
  metadata.section === 'control';

const extractReference = (expected: InvestigationExample['output']): string => {
  const reference = expected?.reference_answer;
  return typeof reference === 'string' ? reference : '';
};

interface OrcaFlagsExtraction {
  named_flags: unknown;
  named_causes: unknown;
  reasoning: string;
}

type InvestigationTaskReport = NonNullable<InvestigationTaskOutput['structured_report']>;

const legacyUnscored = (reason: string) => ({
  score: null,
  label: 'unscored',
  explanation: `The run did not finish, so ORCA does not score it: ${reason}`,
});

/**
 * The earlier accuracy and hallucination scores, from a flag extraction over the structured
 * report rather than ORCA's judge over `report.md`. Kept to compare the two on the same runs.
 */
const createLegacyOrcaFlagsEvaluators = (deps: JudgeDeps): InvestigationEvaluator[] => {
  // One extraction per report. The runner spreads a new `output` for each evaluator, but
  // `structured_report` stays the same object.
  const extractions = new WeakMap<InvestigationTaskReport, Promise<OrcaFlagsExtraction>>();
  const extractFlags = (
    flags: string[],
    expected: InvestigationExample['output'],
    report: InvestigationTaskReport
  ): Promise<OrcaFlagsExtraction> => {
    const extraction =
      extractions.get(report) ??
      invokeJudge<OrcaFlagsExtraction>(deps, 'orca_flags', OrcaFlagsJudgePrompt, {
        plausibleFlags: flags.join(', '),
        reference: extractReference(expected),
        answer: composeAnswerText(report),
      });
    extractions.set(report, extraction);
    return extraction;
  };

  return [
    {
      name: ORCA_FLAGS_RCA_ACCURACY_EVALUATOR,
      kind: 'LLM',
      direction: 'maximize',
      getModel: getModelFactory(deps.evaluationConnector),
      evaluate: async ({ output, expected, metadata }) => {
        const flags = stringList(metadata.plausible_flags);
        if (!flags?.length || isOrcaControl(metadata)) {
          return notApplicable(
            'RCA accuracy applies to an incident with a non-empty plausible flag set.'
          );
        }
        const unscoredReason = orcaRunUnscoredReason(output);
        if (unscoredReason) return legacyUnscored(unscoredReason);
        const report = output.structured_report;
        if (!reportHasFindings(report)) {
          return {
            score: 0,
            label: 'fail',
            explanation: 'The report names none of the plausible flags.',
          };
        }
        const { named_flags: namedFlags, reasoning } = await extractFlags(flags, expected, report);
        const named = stringList(namedFlags);
        if (!named) throw new Error('ORCA accuracy judge returned no flag list');
        const score = scoreOrcaRcaAccuracy({ plausibleFlags: flags, namedFlags: named });
        return {
          score,
          label: score === 1 ? 'pass' : 'fail',
          explanation: reasoning,
          metadata: { plausible_flags: flags, named_flags: named },
        };
      },
    },
    {
      name: ORCA_FLAGS_HALLUCINATION_EVALUATOR,
      kind: 'LLM',
      direction: 'minimize',
      getModel: getModelFactory(deps.evaluationConnector),
      evaluate: async ({ output, expected, metadata }) => {
        const flags = stringList(metadata.plausible_flags);
        if (isOrcaControl(metadata)) {
          return notApplicable('Hallucination applies to an incident, not a control.');
        }
        if (!flags) return notApplicable('Hallucination needs the example plausible flag set.');
        const unscoredReason = orcaRunUnscoredReason(output);
        if (unscoredReason) return legacyUnscored(unscoredReason);
        const report = output.structured_report;
        if (!reportHasFindings(report)) {
          return { score: 0, label: 'pass', explanation: 'The report names no cause.' };
        }
        const extraction = await extractFlags(flags, expected, report);
        const namedCauses = stringList(extraction.named_causes);
        const namedFlags = stringList(extraction.named_flags);
        if (!namedCauses || !namedFlags) {
          throw new Error('ORCA hallucination judge returned no cause list');
        }
        const score = scoreOrcaHallucination({
          plausibleFlags: flags,
          // `named_causes` keeps the report's wording, so a flag may match only in `named_flags`.
          namedCauses: [...namedCauses, ...namedFlags],
        });
        return {
          score,
          label: score === 1 ? 'hallucinated' : 'pass',
          explanation: extraction.reasoning,
          metadata: { plausible_flags: flags, named_causes: namedCauses },
        };
      },
    },
  ];
};

/** Whether `NIGHTSHIFT_ORCA_LEGACY_JUDGES` asks for the earlier flag-based scores as well. */
export const resolveOrcaLegacyJudges = (
  env: Record<string, string | undefined> = process.env
): boolean => ['1', 'true'].includes(env.NIGHTSHIFT_ORCA_LEGACY_JUDGES?.trim().toLowerCase() ?? '');

/**
 * ORCA's graders on `report.md`, the report fidelity check, and optionally the legacy scores.
 * `rubrics` is the pinned rubric release (`loadOrcaRubrics`), keyed by event id.
 */
export const createOrcaEvaluators = (
  deps: JudgeDeps,
  {
    rubrics,
    legacy = resolveOrcaLegacyJudges(),
  }: { rubrics: ReadonlyMap<string, OrcaRubric>; legacy?: boolean }
): InvestigationEvaluator[] => [
  ...createPortedOrcaEvaluators(deps, rubrics),
  createReportFidelityEvaluator(deps),
  ...(legacy ? createLegacyOrcaFlagsEvaluators(deps) : []),
];

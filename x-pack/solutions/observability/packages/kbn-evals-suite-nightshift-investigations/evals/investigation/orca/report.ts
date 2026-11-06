/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { InvestigationTaskOutput } from '../types';
import { NO_CONCLUSION_ERROR } from '../task';
import type { JudgeDeps } from '../judges/invoke_judge';
import { invokeJudge } from '../judges/invoke_judge';
import { composeAnswerText, composeEvidenceText, composeTrajectoryText } from '../judges/scoring';
import { OrcaReportPrompt } from './prompts';

/** ORCA's reports run to a few thousand characters; a longer one is kept only in part. */
export const MAX_ORCA_REPORT_LENGTH = 100_000;

type InvestigationTaskReport = NonNullable<InvestigationTaskOutput['structured_report']>;

/** A default severity alone is not a report. */
export const reportHasFindings = (
  report: InvestigationTaskOutput['structured_report']
): report is InvestigationTaskReport =>
  Boolean(report?.conclusion || report?.summary || report?.hypotheses?.length);

/**
 * Why the investigation left nothing ORCA can grade, or undefined when it can. A run that crashed,
 * timed out, or ended without recording anything has no answer, and reading it as an empty one
 * would pass a control. `orcaAgentFailure` says which of these ORCA scores 0 rather than leaving
 * out; `execution_success` counts them all.
 */
export const orcaRunUnscoredReason = ({
  execution_error: executionError,
  structured_report: report,
  report_truncated: reportTruncated,
}: InvestigationTaskOutput): string | undefined => {
  // An oversized report keeps only its summary and conclusion, so a recorded cause may be missing.
  if (reportTruncated) return 'the report was too large to keep its hypotheses';
  if (!executionError) return undefined;
  if (executionError === NO_CONCLUSION_ERROR && reportHasFindings(report)) return undefined;
  return executionError;
};

/**
 * The agent's own failure, which the paper scores rather than retries: it kept trials that raised
 * `AgentTimeoutError` or `NonZeroAgentExitCodeError`, and the verifier gives a trial without a
 * `report.md` reward 0. Here that is a timed-out investigation, a failed agent round, or one that
 * ended having recorded nothing. Failures of the harness itself, which the paper would have
 * retried, are not the agent's and stay unscored.
 */
export const orcaAgentFailure = (output: InvestigationTaskOutput): string | undefined => {
  const reason = orcaRunUnscoredReason(output);
  if (!reason || output.report_truncated) return undefined;
  const isAgentFailure =
    reason === NO_CONCLUSION_ERROR ||
    reason.startsWith('Investigation was still in progress after') ||
    reason.startsWith('Investigation round failed:');
  return isAgentFailure ? reason : undefined;
};

/**
 * Why ORCA's graders leave this run out, or undefined when they can grade it (a run whose agent
 * failed is graded, as having no report). Every other failure is the harness's.
 */
export const orcaReportUnscoredReason = (output: InvestigationTaskOutput): string | undefined => {
  if (orcaAgentFailure(output)) return undefined;
  const runReason = orcaRunUnscoredReason(output);
  if (runReason) return runReason;
  if (output.orca_report_error) return `report.md was not written: ${output.orca_report_error}`;
  if (output.orca_report_md === undefined) return 'the run has no report.md';
  if (output.orca_report_truncated) return 'report.md was too large to keep whole';
  return undefined;
};

/** The investigation's record, as the report writer and the fidelity judge read it. */
export const composeOrcaInvestigationText = (
  report: InvestigationTaskOutput['structured_report']
): string =>
  [composeAnswerText(report), composeEvidenceText(report)].filter(Boolean).join('\n\nEvidence:\n');

interface OrcaReportArgs {
  incident_occurred: boolean;
  report: string;
}

/**
 * Writes ORCA's `report.md` for a finished investigation with the model under test, as the paper's
 * agent writes its own report. Empty only when the investigation found no incident at any time.
 */
export const writeOrcaReport = async (
  deps: Pick<JudgeDeps, 'inferenceClient' | 'log'>,
  output: InvestigationTaskOutput
): Promise<string> => {
  const { incident_occurred: incidentOccurred, report } = await invokeJudge<OrcaReportArgs>(
    deps,
    'orca_report',
    OrcaReportPrompt,
    {
      question: output.query,
      investigation: composeOrcaInvestigationText(output.structured_report),
      trajectory:
        composeTrajectoryText(output.tool_call_trajectory) || '(No tool calls were captured.)',
    },
    {
      tool: 'write_report',
      validate: (args) => {
        if (typeof args?.incident_occurred !== 'boolean' || typeof args.report !== 'string') {
          throw new Error('The report writer returned no report');
        }
      },
    }
  );
  return incidentOccurred ? report : '';
};

/**
 * Adds `orca_report_md` to a finished run. A run ORCA does not score gets none, and a failed write
 * is recorded as `orca_report_error` so the graders leave the run unscored.
 */
export const addOrcaReport = async (
  deps: Pick<JudgeDeps, 'inferenceClient' | 'log'>,
  output: InvestigationTaskOutput
): Promise<InvestigationTaskOutput> => {
  if (orcaRunUnscoredReason(output)) return output;
  try {
    const report = await writeOrcaReport(deps, output);
    output.orca_report_md = report.slice(0, MAX_ORCA_REPORT_LENGTH);
    if (report.length > MAX_ORCA_REPORT_LENGTH) output.orca_report_truncated = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.orca_report_error = message.slice(0, MAX_TEXT_LENGTH);
  }
  return output;
};

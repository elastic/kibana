/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortError } from 'p-retry';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { ToolingLog } from '@kbn/tooling-log';
import type { InvestigationTaskOutput } from '../types';
import { NO_CONCLUSION_ERROR } from '../task';
import {
  addOrcaReport,
  assertOrcaReportsWritten,
  MAX_ORCA_REPORT_LENGTH,
  orcaReportUnscoredReason,
} from './report';
import { OrcaReportPrompt } from './prompts';

jest.mock('@kbn/inference-tracing', () => ({
  ElasticGenAIAttributes: { InferenceSpanKind: 'elastic.inference.span.kind' },
  withActiveInferenceSpan: (_name: string, _options: object, callback: () => Promise<object>) =>
    callback(),
}));

const writerReturning = (args: { incident_occurred: boolean; report: string }) => {
  const prompt = jest.fn().mockResolvedValue({ toolCalls: [{ function: { arguments: args } }] });
  return {
    prompt,
    deps: { inferenceClient: { prompt } as unknown as BoundInferenceClient, log: new ToolingLog() },
  };
};

const output = (overrides: Partial<InvestigationTaskOutput> = {}): InvestigationTaskOutput => ({
  case_id: 'checkout',
  query: 'The current time is 00:52 ET. Users cannot complete their purchase.',
  structured_report: { conclusion: 'paymentFailure at 10% broke checkout.' },
  tool_call_trajectory: [
    { tool_id: 'nightshift_sandbox_bash', params: { command: 'esql' }, result: '42 errors' },
  ],
  ...overrides,
});

describe('ORCA report.md', () => {
  it('has the model under test write it from the investigation record and trajectory', async () => {
    const { deps, prompt } = writerReturning({
      incident_occurred: true,
      report: '## Summary\n\nx',
    });
    const result = await addOrcaReport(deps, output());
    expect(prompt).toHaveBeenCalledWith({
      prompt: OrcaReportPrompt,
      input: {
        question: 'The current time is 00:52 ET. Users cannot complete their purchase.',
        investigation: 'Conclusion: paymentFailure at 10% broke checkout.',
        trajectory: '1. nightshift_sandbox_bash({"command":"esql"})\n   → 42 errors',
      },
      toolChoice: { function: 'write_report' },
    });
    expect(result.orca_report_md).toBe('## Summary\n\nx');
    expect(orcaReportUnscoredReason(result)).toBeUndefined();
  });

  it("keeps ORCA's instructions and four sections in the writer's system prompt", () => {
    const [{ system }] = OrcaReportPrompt.versions;
    expect(system).toContain('please return an empty report');
    // An incident outside the reported window or already over still gets a report.
    expect(system).toContain(
      'Return an empty report only when the investigation found no incident.'
    );
    expect(system).toContain('a single failed request, scanner 404s or start-up warm-up');
    expect(system).not.toContain('/app/report.md');
    for (const section of ['Summary', 'Timeline', '5 Whys', 'Remediation']) {
      expect(system).toContain(`## Section`);
      expect(system).toContain(section);
    }
  });

  it('is empty when the writer finds that no incident occurred', async () => {
    const { deps } = writerReturning({ incident_occurred: false, report: 'Nothing happened.' });
    const result = await addOrcaReport(deps, output());
    expect(result.orca_report_md).toBe('');
  });

  it('is not written for a run ORCA does not score', async () => {
    const { deps, prompt } = writerReturning({ incident_occurred: true, report: 'x' });
    const result = await addOrcaReport(deps, output({ execution_error: 'Service unavailable' }));
    expect(prompt).not.toHaveBeenCalled();
    expect(result.orca_report_md).toBeUndefined();
  });

  it('is written for a run that recorded hypotheses but no verdict', async () => {
    const { deps, prompt } = writerReturning({ incident_occurred: true, report: 'x' });
    await addOrcaReport(
      deps,
      output({ execution_error: NO_CONCLUSION_ERROR, structured_report: { summary: 'Partial.' } })
    );
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('records a failed write so the graders leave the run unscored, and warns', async () => {
    const prompt = jest.fn().mockRejectedValue(new AbortError('model unavailable'));
    const log = new ToolingLog();
    const warning = jest.spyOn(log, 'warning');
    const result = await addOrcaReport(
      { inferenceClient: { prompt } as unknown as BoundInferenceClient, log },
      output()
    );
    expect(result.orca_report_error).toBe('model unavailable');
    expect(orcaReportUnscoredReason(result)).toBe('report.md was not written: model unavailable');
    expect(warning).toHaveBeenCalledWith(
      'ORCA report.md for checkout was not written: model unavailable'
    );
  });

  it('fails the run when too few of the reports it tried to write can be graded', () => {
    const written = output({ orca_report_md: '# Report' });
    const failed = output({ case_id: 'cart', orca_report_error: 'model unavailable' });
    const truncated = output({
      case_id: 'ads',
      orca_report_md: '# Re',
      orca_report_truncated: true,
    });
    const missing = output({ case_id: 'ship' });
    // A run ORCA leaves out gets no report, so it does not count against the writer.
    const skipped = output({ execution_error: 'harness failed' });
    expect(() =>
      assertOrcaReportsWritten([written, written, written, written, failed])
    ).not.toThrow();
    expect(() => assertOrcaReportsWritten([written, failed, skipped, skipped])).toThrow(
      '1 of 2 ORCA report.md usable, below the 80% threshold:\n- cart: report.md was not written: model unavailable'
    );
    expect(() => assertOrcaReportsWritten([written, truncated, missing])).toThrow(
      '1 of 3 ORCA report.md usable, below the 80% threshold:\n- ads: report.md was too large to keep whole\n- ship: the run has no report.md'
    );
    expect(() => assertOrcaReportsWritten([skipped])).not.toThrow();
  });

  it('keeps an oversized report only in part and marks it', async () => {
    const report = 'x'.repeat(MAX_ORCA_REPORT_LENGTH + 1);
    const { deps } = writerReturning({ incident_occurred: true, report });
    const result = await addOrcaReport(deps, output());
    expect(result.orca_report_md).toHaveLength(MAX_ORCA_REPORT_LENGTH);
    expect(result.orca_report_truncated).toBe(true);
  });
});

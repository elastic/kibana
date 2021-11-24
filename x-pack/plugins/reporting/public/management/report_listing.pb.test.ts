/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fc from 'fast-check';
import { EuiTableRow } from '@elastic/eui';
import { act } from 'react-dom/test-utils';

import { TestBed as ReportListingTestBed, setup, Props } from './__test__';
import { ReportApiJSON } from '../../common/types';
import {
  CSV_REPORT_TYPE,
  PDF_REPORT_TYPE,
  PDF_REPORT_TYPE_V2,
  PNG_REPORT_TYPE,
  PNG_REPORT_TYPE_V2,
  JOB_STATUSES,
  PNG_JOB_TYPE_V2,
  PDF_JOB_TYPE_V2,
} from '../../common/constants';

const option = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

function arbitraryJobJson(): fc.Arbitrary<ReportApiJSON> {
  return fc.record<ReportApiJSON>({
    id: fc.uuid(),
    status: fc.constantFrom(...Object.values(JOB_STATUSES)),
    attempts: fc.nat({ max: 10 }),
    created_at: fc.date().map((date) => date.toISOString()),
    completed_at: option(fc.date().map((date) => date.toISOString())),
    browser_type: option(fc.constantFrom('chromium', 'firefox')),
    kibana_id: option(fc.string({ minLength: 1, maxLength: 10 })),
    kibana_name: option(fc.string({ minLength: 1, maxLength: 10 })),
    output: fc.record({
      content_type: fc.constantFrom(PDF_REPORT_TYPE, PNG_REPORT_TYPE, CSV_REPORT_TYPE),
      size: fc.nat({ max: 50000 }),
      max_size_reached: option(fc.boolean()),
      warnings: option(fc.array(fc.string())),
    }),
    started_at: fc.date().map((date) => date.toISOString()),
    created_by: fc.string({ minLength: 1, maxLength: 10 }),
    index: fc.string({ minLength: 1, maxLength: 10 }),
    jobtype: fc.constantFrom(
      CSV_REPORT_TYPE,
      PDF_REPORT_TYPE,
      PDF_REPORT_TYPE_V2,
      PNG_REPORT_TYPE,
      PNG_REPORT_TYPE_V2,
      'foobar'
    ),
    meta: fc.record({
      objectType: fc.string(),
      layout: option(fc.constantFrom('preserve_layout', 'print', 'canvas', 'foobar')),
      isDeprecated: option(fc.boolean()),
    }),
    migration_version: fc.string({ minLength: 1, maxLength: 10 }),
    payload: fc.record({
      browserTimezone: fc.string({ minLength: 1, maxLength: 10 }),
      objectType: fc.string(),
      title: fc.string({ minLength: 1, maxLength: 20 }),
      version: fc.string({ minLength: 1, maxLength: 10 }),
      isDeprecated: option(fc.boolean()),
      layout: option(
        fc.record({
          id: fc.constantFrom('preserve_layout', 'print', 'canvas', 'foobar'),
          dimensions: fc.record({ height: fc.nat(), width: fc.nat() }),
        })
      ),
      spaceId: option(fc.string({ minLength: 1, maxLength: 10 })),
    }),
    max_attempts: fc.nat({ max: 3 }),
    timeout: fc.nat({ max: 1000 }),
  });
}

// TODO: Implement some test commands to test the UI state changes
// class ReportListingComponentModel {}
// type ReportListingCommands = fc.Command<ReportListingComponentModel, ReportListingTestBed>;

const openInKibanaAppSelector = '[data-test-subj="reportOpenInKibanaApp"]';

describe('Report listing', () => {
  let testBed: ReportListingTestBed;
  const runSetup = async (props: Partial<Props>) => {
    await act(async () => {
      testBed = await setup(props);
    });
    testBed.component.update();
  };
  jest.setTimeout(30000);
  describe('default', () => {
    it('only renders the view in Kibana app link for V2 visual report types', async () => {
      await fc.assert(
        fc
          .asyncProperty(fc.array(arbitraryJobJson(), { maxLength: 10 }), async (jobs) => {
            fc.pre(jobs.length > 0);
            await runSetup({ jobs });
            const jobRows = testBed.component.find(EuiTableRow);

            expect(jobs.length).toBe(jobRows.length);

            jobRows.forEach((row, idx) => {
              const job = jobs[idx];

              expect(
                row.find('[data-test-subj="reportingListItemObjectTitle"]').text().trim()
              ).toBe(job.payload.title.trim());

              if (job.jobtype === PNG_JOB_TYPE_V2 || job.jobtype === PDF_JOB_TYPE_V2) {
                expect(row.find(openInKibanaAppSelector).length).toBe(1);
              } else {
                expect(row.find(openInKibanaAppSelector).length).toBe(0);
              }
            });
          })
          .afterEach(() => jest.resetAllMocks()),
        { numRuns: 50 }
      );
    });
  });
});

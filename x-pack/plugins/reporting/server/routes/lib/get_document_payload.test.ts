/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { CSV_JOB_TYPE, PDF_JOB_TYPE } from '../../../common/constants';
import { ReportApiJSON } from '../../../common/types';
import { ContentStream, getContentStream, statuses } from '../../lib';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { jobsQueryFactory } from './jobs_query';
import { getDocumentPayloadFactory } from './get_document_payload';

jest.mock('../../lib/content_stream');
jest.mock('./jobs_query');

describe('getDocumentPayload', () => {
  let getDocumentPayload: ReturnType<typeof getDocumentPayloadFactory>;

  beforeEach(async () => {
    const schema = createMockConfigSchema();
    const core = await createMockReportingCore(schema);

    getDocumentPayload = getDocumentPayloadFactory(core);

    (getContentStream as jest.MockedFunction<typeof getContentStream>).mockResolvedValue(
      new Readable({
        read() {
          this.push('something');
          this.push(null);
        },
      }) as ContentStream
    );

    (jobsQueryFactory as jest.MockedFunction<typeof jobsQueryFactory>).mockReturnValue({
      getError: jest.fn(async () => 'Some error'),
    } as unknown as ReturnType<typeof jobsQueryFactory>);
  });

  describe('when the report is completed', () => {
    it('should return payload for the completed report', async () => {
      await expect(
        getDocumentPayload({
          id: 'id1',
          index: '.reporting-12345',
          status: statuses.JOB_STATUS_COMPLETED,
          jobtype: PDF_JOB_TYPE,
          output: {
            content_type: 'application/pdf',
            size: 1024,
          },
          payload: { title: 'Some PDF report' },
        } as ReportApiJSON)
      ).resolves.toEqual(
        expect.objectContaining({
          contentType: 'application/pdf',
          content: expect.any(Readable),
          headers: expect.objectContaining({
            'Content-Disposition': 'attachment; filename="Some PDF report.pdf"',
            'Content-Length': '1024',
          }),
          statusCode: 200,
        })
      );
    });

    it('should return warning headers', async () => {
      await expect(
        getDocumentPayload({
          id: 'id1',
          index: '.reporting-12345',
          status: statuses.JOB_STATUS_WARNINGS,
          jobtype: CSV_JOB_TYPE,
          output: {
            content_type: 'text/csv',
            csv_contains_formulas: true,
            max_size_reached: true,
            size: 1024,
          },
          payload: { title: 'Some CSV report' },
        } as ReportApiJSON)
      ).resolves.toEqual(
        expect.objectContaining({
          contentType: 'text/csv',
          content: expect.any(Readable),
          headers: expect.objectContaining({
            'Content-Disposition': 'attachment; filename="Some CSV report.csv"',
            'Content-Length': '1024',
            'kbn-csv-contains-formulas': true,
            'kbn-max-size-reached': true,
          }),
          statusCode: 200,
        })
      );
    });
  });

  describe('when the report is failed', () => {
    it('should return payload for the failed report', async () => {
      await expect(
        getDocumentPayload({
          id: 'id1',
          index: '.reporting-12345',
          status: statuses.JOB_STATUS_FAILED,
          jobtype: PDF_JOB_TYPE,
          output: {},
          payload: {},
        } as ReportApiJSON)
      ).resolves.toEqual(
        expect.objectContaining({
          contentType: 'application/json',
          content: {
            message: expect.stringContaining('Some error'),
          },
          headers: {},
          statusCode: 500,
        })
      );
    });
  });

  describe('when the report is incomplete', () => {
    it('should return payload for the pending report', async () => {
      await expect(
        getDocumentPayload({
          id: 'id1',
          index: '.reporting-12345',
          status: statuses.JOB_STATUS_PENDING,
          jobtype: PDF_JOB_TYPE,
          output: {},
          payload: {},
        } as ReportApiJSON)
      ).resolves.toEqual(
        expect.objectContaining({
          contentType: 'text/plain',
          content: 'pending',
          headers: {
            'retry-after': '30',
          },
          statusCode: 503,
        })
      );
    });
  });
});

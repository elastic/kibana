/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import { JOB_STATUS } from '@kbn/reporting-common';
import { ReportApiJSON } from '@kbn/reporting-common/types';
import { CSV_JOB_TYPE } from '@kbn/reporting-export-types-csv-common';
import { PDF_JOB_TYPE, PDF_JOB_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';

import { ReportingCore } from '../../..';
import { ContentStream, getContentStream } from '../../../lib';
import { createMockReportingCore } from '../../../test_helpers';
import { STATUS_CODES } from './constants';
import { getDocumentPayloadFactory } from './get_document_payload';
import { jobsQueryFactory } from './jobs_query';

jest.mock('../../../lib/content_stream');
jest.mock('./jobs_query');

describe('getDocumentPayload', () => {
  let core: ReportingCore;
  let getDocumentPayload: ReturnType<typeof getDocumentPayloadFactory>;

  beforeEach(async () => {
    const schema = createMockConfigSchema();
    core = await createMockReportingCore(schema);

    getDocumentPayload = getDocumentPayloadFactory(core, { isInternal: false });

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
          status: JOB_STATUS.COMPLETED,
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
          filename: 'Some PDF report.pdf',
          headers: expect.objectContaining({
            'Content-Length': '1024',
          }),
          statusCode: STATUS_CODES.COMPLETED,
        })
      );
    });

    it('should return warning headers', async () => {
      await expect(
        getDocumentPayload({
          id: 'id1',
          index: '.reporting-12345',
          status: JOB_STATUS.WARNINGS,
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
          filename: 'Some CSV report.csv',
          headers: expect.objectContaining({
            'Content-Length': '1024',
            'kbn-csv-contains-formulas': true,
            'kbn-max-size-reached': true,
          }),
          statusCode: STATUS_CODES.COMPLETED,
        })
      );
    });
  });

  describe('public API behavior', () => {
    beforeEach(() => {
      getDocumentPayload = getDocumentPayloadFactory(core, { isInternal: false });
    });

    describe('when the report is failed', () => {
      it('should return payload for the failed report', async () => {
        await expect(
          getDocumentPayload({
            id: 'id1',
            index: '.reporting-12345',
            status: JOB_STATUS.FAILED,
            jobtype: PDF_JOB_TYPE_V2,
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
            statusCode: STATUS_CODES.FAILED.PUBLIC,
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
            status: JOB_STATUS.PENDING,
            jobtype: PDF_JOB_TYPE_V2,
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
            statusCode: STATUS_CODES.PENDING.PUBLIC,
          })
        );
      });
    });
  });

  describe('internal API behavior', () => {
    beforeEach(() => {
      getDocumentPayload = getDocumentPayloadFactory(core, { isInternal: true });
    });

    describe('when the report is failed', () => {
      it('should return payload for the failed report', async () => {
        await expect(
          getDocumentPayload({
            id: 'id1',
            index: '.reporting-12345',
            status: JOB_STATUS.FAILED,
            jobtype: PDF_JOB_TYPE_V2,
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
            statusCode: STATUS_CODES.FAILED.INTERNAL,
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
            status: JOB_STATUS.PENDING,
            jobtype: PDF_JOB_TYPE_V2,
            output: {},
            payload: {},
          } as ReportApiJSON)
        ).resolves.toEqual(
          expect.objectContaining({
            contentType: 'text/plain',
            content: 'pending',
            headers: { 'retry-after': '30' },
            statusCode: STATUS_CODES.PENDING.INTERNAL,
          })
        );
      });
    });
  });
});

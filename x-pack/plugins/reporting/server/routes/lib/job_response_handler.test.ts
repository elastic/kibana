/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable, Writable } from 'stream';
import { kibanaResponseFactory } from 'src/core/server';
import { CSV_JOB_TYPE, PDF_JOB_TYPE } from '../../../common/constants';
import { ReportingCore } from '../..';
import { ContentStream, getContentStream } from '../../lib';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { jobsQueryFactory } from './jobs_query';
import { getDocumentPayloadFactory } from './get_document_payload';
import { deleteJobResponseHandler, downloadJobResponseHandler } from './job_response_handler';

jest.mock('../../lib/content_stream');
jest.mock('./get_document_payload');
jest.mock('./jobs_query');

let core: ReportingCore;
let getDocumentPayload: jest.MockedFunction<ReturnType<typeof getDocumentPayloadFactory>>;
let jobsQuery: jest.Mocked<ReturnType<typeof jobsQueryFactory>>;
let response: jest.Mocked<typeof kibanaResponseFactory>;
let write: jest.Mocked<Writable['_write']>;

beforeEach(async () => {
  const schema = createMockConfigSchema();
  core = await createMockReportingCore(schema);
  getDocumentPayload = jest.fn();
  jobsQuery = {
    delete: jest.fn(),
    get: jest.fn(),
  } as unknown as typeof jobsQuery;
  response = {
    badRequest: jest.fn(),
    custom: jest.fn(),
    customError: jest.fn(),
    notFound: jest.fn(),
    ok: jest.fn(),
    unauthorized: jest.fn(),
  } as unknown as typeof response;
  write = jest.fn((_chunk, _encoding, callback) => callback());

  (getContentStream as jest.MockedFunction<typeof getContentStream>).mockResolvedValue(
    new Writable({ write }) as ContentStream
  );
  (
    getDocumentPayloadFactory as jest.MockedFunction<typeof getDocumentPayloadFactory>
  ).mockReturnValue(getDocumentPayload);
  (jobsQueryFactory as jest.MockedFunction<typeof jobsQueryFactory>).mockReturnValue(jobsQuery);
});

describe('deleteJobResponseHandler', () => {
  it('should return not found response when there is no job', async () => {
    jobsQuery.get.mockResolvedValueOnce(undefined);
    await deleteJobResponseHandler(core, response, [], { username: 'somebody' }, { docId: 'id' });

    expect(response.notFound).toHaveBeenCalled();
  });

  it('should return unauthorized response when the job type is not valid', async () => {
    jobsQuery.get.mockResolvedValueOnce({ jobtype: PDF_JOB_TYPE } as Awaited<
      ReturnType<typeof jobsQuery.get>
    >);
    await deleteJobResponseHandler(
      core,
      response,
      [CSV_JOB_TYPE],
      { username: 'somebody' },
      { docId: 'id' }
    );

    expect(response.unauthorized).toHaveBeenCalledWith({ body: expect.any(String) });
  });

  it('should delete existing job', async () => {
    jobsQuery.get.mockResolvedValueOnce({
      jobtype: PDF_JOB_TYPE,
      index: '.reporting-12345',
    } as Awaited<ReturnType<typeof jobsQuery.get>>);
    await deleteJobResponseHandler(
      core,
      response,
      [PDF_JOB_TYPE],
      { username: 'somebody' },
      { docId: 'id' }
    );

    expect(write).toHaveBeenCalledWith(Buffer.from(''), expect.anything(), expect.anything());
    expect(jobsQuery.delete).toHaveBeenCalledWith('.reporting-12345', 'id');
    expect(response.ok).toHaveBeenCalledWith({ body: { deleted: true } });
  });

  it('should return a custom error on exception', async () => {
    jobsQuery.get.mockResolvedValueOnce({ jobtype: PDF_JOB_TYPE } as Awaited<
      ReturnType<typeof jobsQuery.get>
    >);
    jobsQuery.delete.mockRejectedValueOnce(
      Object.assign(new Error('Some error.'), { statusCode: 123 })
    );
    await deleteJobResponseHandler(
      core,
      response,
      [PDF_JOB_TYPE],
      { username: 'somebody' },
      { docId: 'id' }
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 123,
      body: 'Some error.',
    });
  });
});

describe('downloadJobResponseHandler', () => {
  it('should return not found response when there is no job', async () => {
    jobsQuery.get.mockResolvedValueOnce(undefined);
    await downloadJobResponseHandler(core, response, [], { username: 'somebody' }, { docId: 'id' });

    expect(response.notFound).toHaveBeenCalled();
  });

  it('should return unauthorized response when the job type is not valid', async () => {
    jobsQuery.get.mockResolvedValueOnce({ jobtype: PDF_JOB_TYPE } as Awaited<
      ReturnType<typeof jobsQuery.get>
    >);
    await downloadJobResponseHandler(
      core,
      response,
      [CSV_JOB_TYPE],
      { username: 'somebody' },
      { docId: 'id' }
    );

    expect(response.unauthorized).toHaveBeenCalledWith({ body: expect.any(String) });
  });

  it('should return bad request response when the job content type is not allowed', async () => {
    jobsQuery.get.mockResolvedValueOnce({ jobtype: PDF_JOB_TYPE } as Awaited<
      ReturnType<typeof jobsQuery.get>
    >);
    getDocumentPayload.mockResolvedValueOnce({
      contentType: 'image/jpeg',
    } as unknown as Awaited<ReturnType<typeof getDocumentPayload>>);
    await downloadJobResponseHandler(
      core,
      response,
      [PDF_JOB_TYPE],
      { username: 'somebody' },
      { docId: 'id' }
    );

    expect(response.badRequest).toHaveBeenCalledWith({ body: expect.any(String) });
  });

  it('should return custom response with payload contents', async () => {
    jobsQuery.get.mockResolvedValueOnce({ jobtype: PDF_JOB_TYPE } as Awaited<
      ReturnType<typeof jobsQuery.get>
    >);
    getDocumentPayload.mockResolvedValueOnce({
      content: new Readable(),
      contentType: 'application/pdf',
      headers: {
        'Content-Length': 10,
      },
      statusCode: 200,
    } as unknown as Awaited<ReturnType<typeof getDocumentPayload>>);
    await downloadJobResponseHandler(
      core,
      response,
      [PDF_JOB_TYPE],
      { username: 'somebody' },
      { docId: 'id' }
    );

    expect(response.custom).toHaveBeenCalledWith({
      body: expect.any(Readable),
      statusCode: 200,
      headers: expect.objectContaining({
        'Content-Length': 10,
        'content-type': 'application/pdf',
      }),
    });
  });

  it('should return custom response with error message', async () => {
    jobsQuery.get.mockResolvedValueOnce({ jobtype: PDF_JOB_TYPE } as Awaited<
      ReturnType<typeof jobsQuery.get>
    >);
    getDocumentPayload.mockResolvedValueOnce({
      content: 'Error message.',
      contentType: 'application/json',
      headers: {},
      statusCode: 500,
    } as unknown as Awaited<ReturnType<typeof getDocumentPayload>>);
    await downloadJobResponseHandler(
      core,
      response,
      [PDF_JOB_TYPE],
      { username: 'somebody' },
      { docId: 'id' }
    );

    expect(response.custom).toHaveBeenCalledWith({
      body: Buffer.from('Error message.'),
      statusCode: 500,
      headers: expect.objectContaining({
        'content-type': 'application/json',
      }),
    });
  });
});

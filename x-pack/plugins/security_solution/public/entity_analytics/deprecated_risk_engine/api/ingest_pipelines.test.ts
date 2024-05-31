/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { HttpSetup } from '@kbn/core/public';
import { createIngestPipeline, deleteIngestPipelines } from './ingest_pipelines';

const mockRequest = jest.fn();
const mockHttp = {
  put: mockRequest,
  post: mockRequest,
  delete: mockRequest,
} as unknown as HttpSetup;

const startServices = coreMock.createStart();
const mockAddDanger = jest.spyOn(startServices.notifications.toasts, 'addDanger');

const mockRenderDocLink = jest.fn();

describe('createIngestPipeline', () => {
  const mockOptions = { name: 'test', processors: [] };

  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await createIngestPipeline({
      http: mockHttp,
      options: mockOptions,
      renderDocLink: mockRenderDocLink,
      startServices,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('create ingest pipeline', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/api/ingest_pipelines`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "text": [Function],
        "title": "Failed to create Ingest pipeline",
      }
    `);
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

describe('deleteIngestPipelines', () => {
  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await deleteIngestPipelines({
      http: mockHttp,
      names: 'test,abc',
      renderDocLink: mockRenderDocLink,
      startServices,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('delete ingest pipeline', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/api/ingest_pipelines/test,abc`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "text": [Function],
        "title": "Failed to delete Ingest pipelines",
      }
    `);
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

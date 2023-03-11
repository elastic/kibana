/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import { createIngestPipeline, deleteIngestPipelines } from './ingest_pipelines';

const mockRequest = jest.fn();
const mockHttp = {
  put: mockRequest,
  post: mockRequest,
  delete: mockRequest,
} as unknown as HttpSetup;

const mockAddDanger = jest.fn();
const mockAddError = jest.fn();
const mockNotification = {
  toasts: {
    addDanger: mockAddDanger,
    addError: mockAddError,
  },
} as unknown as NotificationsStart;

const mockRenderDocLink = jest.fn();

describe('createIngestPipeline', () => {
  const mockOptions = { name: 'test', processors: [] };

  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await createIngestPipeline({
      http: mockHttp,
      notifications: mockNotification,
      options: mockOptions,
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('create ingest pipeline', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/api/ingest_pipelines`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0].title).toEqual('Failed to create Ingest pipeline');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

describe('deleteIngestPipelines', () => {
  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await deleteIngestPipelines({
      http: mockHttp,
      notifications: mockNotification,
      names: 'test,abc',
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('delete ingest pipeline', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/api/ingest_pipelines/test,abc`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0].title).toEqual('Failed to delete Ingest pipelines');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

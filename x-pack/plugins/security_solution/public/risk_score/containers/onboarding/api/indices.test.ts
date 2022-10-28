/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { createIndices, deleteIndices } from './indices';

const mockRequest = jest.fn();
const mockHttp = {
  put: mockRequest,
  post: mockRequest,
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

describe('createIndices', () => {
  const mockOptions = { index: 'test', mappings: {} };

  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await createIndices({
      http: mockHttp,
      notifications: mockNotification,
      options: mockOptions,
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('create index', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/risk_score/indices/create`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0].title).toEqual('Failed to create index');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

describe('deleteIndices', () => {
  const mockOptions = { indices: ['test', 'abc'] };

  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await deleteIndices({
      http: mockHttp,
      notifications: mockNotification,
      options: mockOptions,
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('delete index', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/risk_score/indices/delete`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0].title).toEqual('Failed to delete indices');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

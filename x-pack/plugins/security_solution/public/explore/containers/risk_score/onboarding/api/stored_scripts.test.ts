/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import { createStoredScript, deleteStoredScript } from './stored_scripts';

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

describe('createStoredScript', () => {
  const mockOptions = { id: 'test', script: { lang: 'painless', source: '' } };

  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await createStoredScript({
      http: mockHttp,
      notifications: mockNotification,
      options: mockOptions,
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('create stored script', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/risk_score/stored_scripts/create`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0].title).toEqual('Failed to create stored script');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

describe('deleteStoredScript', () => {
  const mockOptions = { id: 'test' };

  beforeAll(async () => {
    mockRequest.mockRejectedValue({ body: { message: 'test error' } });
    await deleteStoredScript({
      http: mockHttp,
      notifications: mockNotification,
      options: mockOptions,
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('delete stored script', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/risk_score/stored_scripts/delete`);
  });

  it('handles error', () => {
    expect(mockAddDanger.mock.calls[0][0].title).toEqual('Failed to delete stored script');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test error');
  });
});

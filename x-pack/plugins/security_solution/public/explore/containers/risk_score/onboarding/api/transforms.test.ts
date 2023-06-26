/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import { createTransform, deleteTransforms, getTransformState, stopTransforms } from './transforms';

const mockRequest = jest.fn();
const mockHttp = {
  get: mockRequest,
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

describe('createTransform', () => {
  const mockOptions = {};

  beforeAll(async () => {
    mockRequest.mockResolvedValue({
      errors: [
        { id: 'test', error: { name: 'test error', output: { payload: { cause: 'unknown' } } } },
      ],
    });
    await createTransform({
      http: mockHttp,
      notifications: mockNotification,
      options: mockOptions,
      renderDocLink: mockRenderDocLink,
      transformId: 'test',
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('create transform', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/transform/transforms/test`);
  });

  it('handles error', () => {
    expect(mockAddError.mock.calls[0][1].title).toEqual('Failed to create Transform');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test: unknown');
  });
});

describe('getTransformState', () => {
  beforeAll(async () => {
    mockRequest.mockResolvedValue({
      count: 0,
    });
    await getTransformState({
      http: mockHttp,
      notifications: mockNotification,
      renderDocLink: mockRenderDocLink,
      transformId: 'test',
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('get transform state', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/transform/transforms/test/_stats`);
  });

  it('handles error', () => {
    expect(mockAddError.mock.calls[0][1].title).toEqual('Failed to get Transform state');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('Transform not found: test');
  });
});

describe('startTransforms', () => {
  beforeAll(async () => {
    mockRequest.mockResolvedValue({
      count: 0,
    });
    await getTransformState({
      http: mockHttp,
      notifications: mockNotification,
      renderDocLink: mockRenderDocLink,
      transformId: 'test',
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('get transform state', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/transform/transforms/test/_stats`);
  });

  it('handles error', () => {
    expect(mockAddError.mock.calls[0][1].title).toEqual('Failed to get Transform state');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('Transform not found: test');
  });
});

describe('stopTransforms', () => {
  beforeAll(async () => {
    // mock get transform state result
    mockRequest.mockResolvedValueOnce({
      transforms: [{ id: 'test', state: 'stopped' }],
      count: 1,
    });
    // mock stop transform result
    mockRequest.mockResolvedValueOnce({
      test: {
        success: false,
        error: {
          root_cause: '',
          type: '',
          reason: 'unknown',
        },
      },
    });

    await stopTransforms({
      http: mockHttp,
      notifications: mockNotification,
      transformIds: ['test'],
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('get transform state', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/transform/transforms/test/_stats`);
  });

  it('stop transform', () => {
    expect(mockRequest.mock.calls[1][0]).toEqual(`/internal/transform/stop_transforms`);
  });

  it('handles error', () => {
    expect(mockAddError.mock.calls[0][1].title).toEqual('Failed to stop Transform');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test: unknown');
  });
});

describe('deleteTransforms', () => {
  const mockOptions = {
    deleteDestIndex: true,
    deleteDestDataView: true,
    forceDelete: false,
  };

  beforeAll(async () => {
    // mock get transform state result
    mockRequest.mockResolvedValueOnce({
      transforms: [{ id: 'test', state: 'stopped' }],
      count: 1,
    });
    // mock stop transform result
    mockRequest.mockResolvedValueOnce({
      test: {
        success: true,
      },
    });
    // mock delete transform result
    mockRequest.mockResolvedValue({
      test: {
        transformDeleted: {
          success: false,
          error: {
            root_cause: '',
            type: '',
            reason: 'unknown',
          },
        },
        destIndexDeleted: false,
        destDataViewDeleted: false,
      },
    });
    await deleteTransforms({
      http: mockHttp,
      notifications: mockNotification,
      options: mockOptions,
      transformIds: ['test'],
      renderDocLink: mockRenderDocLink,
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('get transform state', () => {
    expect(mockRequest.mock.calls[0][0]).toEqual(`/internal/transform/transforms/test/_stats`);
  });

  it('stop transform', () => {
    expect(mockRequest.mock.calls[1][0]).toEqual(`/internal/transform/stop_transforms`);
  });

  it('delete transform', () => {
    expect(mockRequest.mock.calls[2][0]).toEqual(`/internal/transform/delete_transforms`);
  });

  it('handles error', () => {
    expect(mockAddError.mock.calls[0][1].title).toEqual('Failed to delete Transform');
    expect(mockRenderDocLink.mock.calls[0][0]).toEqual('test: unknown');
  });
});

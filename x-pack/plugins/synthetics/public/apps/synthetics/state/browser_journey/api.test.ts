/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJourneyScreenshot } from './api';

describe('getJourneyScreenshot', () => {
  const url = 'http://localhost:5601/internal/uptime/journey/screenshot/checkgroup/step';
  it('returns null if the response status is not 200', async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce({ status: 404 });
    (global as any).fetch = mockFetch;

    const result = await getJourneyScreenshot(url);
    expect(result).toBeNull();
  });

  it('returns a ref if `content-type` is application/json', async () => {
    const mockResponse = {
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'content-type') return 'application/json';
          if (header === 'caption-name') return 'stepName';
          if (header === 'max-steps') return '0';
        }),
      },
      json: jest.fn().mockResolvedValue({}),
      status: 200,
    };

    const mockFetch = jest.fn().mockResolvedValue(mockResponse);
    global.fetch = mockFetch;

    const result = await getJourneyScreenshot('imgSrc');
    expect(result).toEqual({
      ref: {},
      stepName: 'stepName',
      maxSteps: 0,
    });
  });

  it('returns a blob when `content-type` is not application/json', async () => {
    const mockResponse = {
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'content-type') return 'image/jpeg';
          if (header === 'caption-name') return 'stepName';
          if (header === 'max-steps') return '0';
        }),
      },
      blob: jest.fn().mockResolvedValue(new Blob()),
      status: 200,
    };

    const mockFetch = jest.fn().mockResolvedValue(mockResponse);
    global.fetch = mockFetch;

    const result = await getJourneyScreenshot(url);
    expect(result).toEqual({
      src: expect.any(String),
      stepName: 'stepName',
      maxSteps: 0,
    });
  });

  it('does not retry if `shouldBackoff` is false', async () => {
    const mockResponse = {
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'content-type') return 'image/jpeg';
          if (header === 'caption-name') return 'stepName';
          if (header === 'max-steps') return '0';
        }),
      },
      blob: jest.fn().mockResolvedValue(new Blob()),
      status: 404,
    };

    const mockFetch = jest.fn().mockResolvedValue(mockResponse);
    global.fetch = mockFetch;

    const result = await getJourneyScreenshot(url, { shouldBackoff: false });
    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('will retry `n` times', async () => {
    const mockFailResponse = {
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'content-type') return 'image/jpeg';
          if (header === 'caption-name') return 'stepName';
          if (header === 'max-steps') return '0';
        }),
      },
      blob: jest.fn().mockResolvedValue(new Blob()),
      status: 404,
    };
    const mockSuccessResponse = {
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'content-type') return 'application/json';
          if (header === 'caption-name') return 'stepName';
          if (header === 'max-steps') return '0';
        }),
      },
      json: jest.fn().mockResolvedValue({}),
      status: 200,
    };
    let fetchCount = 0;

    const mockFetch = jest.fn().mockImplementation(() => {
      fetchCount++;
      if (fetchCount > 4) {
        return mockSuccessResponse;
      }
      return mockFailResponse;
    });
    global.fetch = mockFetch;

    const result = await getJourneyScreenshot(url);
    expect(result).toEqual({
      ref: {},
      stepName: 'stepName',
      maxSteps: 0,
    });
  });

  it('will return null when retry is exhausted', async () => {
    const maxRetry = 3;
    const initialBackoff = 10;
    const mockResponse = {
      headers: {
        get: jest.fn().mockImplementation((header) => {
          if (header === 'content-type') return 'image/jpeg';
          if (header === 'caption-name') return 'stepName';
          if (header === 'max-steps') return '0';
        }),
      },
      blob: jest.fn().mockResolvedValue(new Blob()),
      status: 404,
    };

    const mockFetch = jest.fn().mockReturnValue(mockResponse);
    global.fetch = mockFetch;

    const result = await getJourneyScreenshot(url, {
      shouldBackoff: true,
      maxRetry,
      initialBackoff,
    });
    expect(result).toBeNull();
    expect(mockFetch).toBeCalledTimes(maxRetry + 1);
  });
});

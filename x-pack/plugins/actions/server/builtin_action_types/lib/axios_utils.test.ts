/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { addTimeZoneToDate, throwIfNotAlive, request, patch, getErrorMessage } from './axios_utils';
jest.mock('axios');
const axiosMock = (axios as unknown) as jest.Mock;

describe('addTimeZoneToDate', () => {
  test('adds timezone with default', () => {
    const date = addTimeZoneToDate('2020-04-14T15:01:55.456Z');
    expect(date).toBe('2020-04-14T15:01:55.456Z GMT');
  });

  test('adds timezone correctly', () => {
    const date = addTimeZoneToDate('2020-04-14T15:01:55.456Z', 'PST');
    expect(date).toBe('2020-04-14T15:01:55.456Z PST');
  });
});

describe('throwIfNotAlive ', () => {
  test('throws correctly when status is invalid', async () => {
    expect(() => {
      throwIfNotAlive(404, 'application/json');
    }).toThrow('Instance is not alive.');
  });

  test('throws correctly when content is invalid', () => {
    expect(() => {
      throwIfNotAlive(200, 'application/html');
    }).toThrow('Instance is not alive.');
  });

  test('do NOT throws with custom validStatusCodes', async () => {
    expect(() => {
      throwIfNotAlive(404, 'application/json', [404]);
    }).not.toThrow('Instance is not alive.');
  });
});

describe('request', () => {
  beforeEach(() => {
    axiosMock.mockImplementation(() => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    }));
  });

  test('it fetch correctly with defaults', async () => {
    const res = await request({ axios, url: '/test' });

    expect(axiosMock).toHaveBeenCalledWith('/test', { method: 'get', data: {} });
    expect(res).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    });
  });

  test('it fetch correctly', async () => {
    const res = await request({ axios, url: '/test', method: 'post', data: { id: '123' } });

    expect(axiosMock).toHaveBeenCalledWith('/test', { method: 'post', data: { id: '123' } });
    expect(res).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    });
  });

  test('it throws correctly', async () => {
    axiosMock.mockImplementation(() => ({
      status: 404,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    }));

    await expect(request({ axios, url: '/test' })).rejects.toThrow();
  });
});

describe('patch', () => {
  beforeEach(() => {
    axiosMock.mockImplementation(() => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
  });

  test('it fetch correctly', async () => {
    await patch({ axios, url: '/test', data: { id: '123' } });
    expect(axiosMock).toHaveBeenCalledWith('/test', { method: 'patch', data: { id: '123' } });
  });
});

describe('getErrorMessage', () => {
  test('it returns the correct error message', () => {
    const msg = getErrorMessage('My connector name', 'An error has occurred');
    expect(msg).toBe('[Action][My connector name]: An error has occurred');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Agent as HttpsAgent } from 'https';
import { Logger } from '../../../../../../src/core/server';
import { addTimeZoneToDate, request, patch, getErrorMessage } from './axios_utils';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { getCustomAgents } from './get_custom_agents';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
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

describe('request', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    axiosMock.mockImplementation(() => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    }));
  });

  test('it fetch correctly with defaults', async () => {
    const res = await request({
      axios,
      url: '/test',
      logger,
      configurationUtilities,
    });

    expect(axiosMock).toHaveBeenCalledWith('/test', {
      method: 'get',
      data: {},
      httpAgent: undefined,
      httpsAgent: expect.any(HttpsAgent),
      proxy: false,
    });
    expect(res).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    });
  });

  test('it have been called with proper proxy agent for a valid url', async () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyRejectUnauthorizedCertificates: true,
      proxyUrl: 'https://localhost:1212',
    });
    const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger);

    const res = await request({
      axios,
      url: 'http://testProxy',
      logger,
      configurationUtilities,
    });

    expect(axiosMock).toHaveBeenCalledWith('http://testProxy', {
      method: 'get',
      data: {},
      httpAgent,
      httpsAgent,
      proxy: false,
    });
    expect(res).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    });
  });

  test('it have been called with proper proxy agent for an invalid url', async () => {
    configurationUtilities.getProxySettings.mockReturnValue({
      proxyUrl: ':nope:',
      proxyRejectUnauthorizedCertificates: false,
    });
    const res = await request({
      axios,
      url: 'https://testProxy',
      logger,
      configurationUtilities,
    });

    expect(axiosMock).toHaveBeenCalledWith('https://testProxy', {
      method: 'get',
      data: {},
      httpAgent: undefined,
      httpsAgent: expect.any(HttpsAgent),
      proxy: false,
    });
    expect(res).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    });
  });

  test('it fetch correctly', async () => {
    const res = await request({
      axios,
      url: '/test',
      method: 'post',
      logger,
      data: { id: '123' },
      configurationUtilities,
    });

    expect(axiosMock).toHaveBeenCalledWith('/test', {
      method: 'post',
      data: { id: '123' },
      httpAgent: undefined,
      httpsAgent: expect.any(HttpsAgent),
      proxy: false,
    });
    expect(res).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { incidentId: '123' },
    });
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
    await patch({ axios, url: '/test', data: { id: '123' }, logger, configurationUtilities });
    expect(axiosMock).toHaveBeenCalledWith('/test', {
      method: 'patch',
      data: { id: '123' },
      httpAgent: undefined,
      httpsAgent: expect.any(HttpsAgent),
      proxy: false,
    });
  });
});

describe('getErrorMessage', () => {
  test('it returns the correct error message', () => {
    const msg = getErrorMessage('My connector name', 'An error has occurred');
    expect(msg).toBe('[Action][My connector name]: An error has occurred');
  });
});

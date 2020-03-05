/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { ServiceNow } from '.';
import {
  instance,
  incident,
  axiosResponse,
  userIdResponse,
  incidentAxiosResponse,
  incidentResponse,
  params,
} from '../../servicenow/mock';
import { USER_URL, INCIDENT_URL } from './constants';

jest.mock('axios');

axios.create = jest.fn(() => axios);
const axiosMock = (axios as unknown) as jest.Mock;

let serviceNow: ServiceNow;

const testMissingConfiguration = (field: string) => {
  expect.assertions(1);
  try {
    new ServiceNow({ ...instance, [field]: '' });
  } catch (error) {
    expect(error.message).toEqual('[Action][ServiceNow]: Wrong configuration.');
  }
};

const prependInstanceUrl = (url: string): string => `${instance.url}/${url}`;

describe('ServiceNow lib', () => {
  beforeEach(() => {
    serviceNow = new ServiceNow(instance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should thrown an error if url is missing', () => {
    testMissingConfiguration('url');
  });

  test('should thrown an error if username is missing', () => {
    testMissingConfiguration('username');
  });

  test('should thrown an error if password is missing', () => {
    testMissingConfiguration('password');
  });

  test('get user id', async () => {
    axiosMock.mockResolvedValue({ ...axiosResponse, data: userIdResponse });
    const res = await serviceNow.getUserID();
    const [url, { method }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl(`${USER_URL}${instance.username}`));
    expect(method).toEqual('get');
    expect(res).toEqual(userIdResponse.result[0].sys_id);
  });

  test('create incident', async () => {
    axiosMock.mockResolvedValue({ ...axiosResponse, data: incidentAxiosResponse });
    const res = await serviceNow.createIncident(incident);
    const [url, { method }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl(`${INCIDENT_URL}`));
    expect(method).toEqual('post');
    expect(res).toEqual(incidentResponse);
  });

  test('update incident', async () => {
    axiosMock.mockResolvedValue({ ...axiosResponse, data: {} });
    const res = await serviceNow.updateIncident(params.incidentId!, {
      short_description: params.title,
    });
    const [url, { method }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl(`${INCIDENT_URL}/${params.incidentId}`));
    expect(method).toEqual('patch');
    expect(res).not.toBeDefined();
  });

  test('add comment', async () => {
    const fieldKey = 'comments';

    axiosMock.mockResolvedValue({ ...axiosResponse, data: {} });
    const res = await serviceNow.addComment(
      params.incidentId!,
      params.comments![0].comment,
      fieldKey
    );

    const [url, { method, data }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl(`${INCIDENT_URL}/${params.incidentId}`));
    expect(method).toEqual('patch');
    expect(data).toEqual({ [fieldKey]: params.comments![0].comment });
    expect(res).not.toBeDefined();
  });

  test('add batch comment', async () => {
    const fieldKey = 'comments';

    axiosMock.mockResolvedValue({ ...axiosResponse, data: {} });
    const res = await serviceNow.batchAddComments(
      params.incidentId!,
      params.comments!.map(c => c.comment),
      fieldKey
    );

    for (let i = 0; i < params.comments!.length; i++) {
      const [url, { method, data }] = axiosMock.mock.calls[i];
      expect(url).toEqual(prependInstanceUrl(`${INCIDENT_URL}/${params.incidentId}`));
      expect(method).toEqual('patch');
      expect(data).toEqual({ [fieldKey]: params.comments![i].comment });
      expect(res).not.toBeDefined();
    }
  });

  test('throw if not status is not ok', async () => {
    expect.assertions(1);

    axiosMock.mockResolvedValue({ ...axiosResponse, status: 401 });
    try {
      await serviceNow.getUserID();
    } catch (error) {
      expect(error.message).toEqual('[ServiceNow]: Instance is not alive.');
    }
  });

  test('throw if not content-type is not application/json', async () => {
    expect.assertions(1);

    axiosMock.mockResolvedValue({
      ...axiosResponse,
      headers: { 'content-type': 'application/html' },
    });
    try {
      await serviceNow.getUserID();
    } catch (error) {
      expect(error.message).toEqual('[ServiceNow]: Instance is not alive.');
    }
  });
});

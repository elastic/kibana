/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { ServiceNow } from '.';
import { instance, params } from '../mock';

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
    axiosMock.mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      data: { result: [{ sys_id: '123' }] },
    });

    const res = await serviceNow.getUserID();
    const [url, { method }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl('api/now/v2/table/sys_user?user_name=username'));
    expect(method).toEqual('get');
    expect(res).toEqual('123');
  });

  test('create incident', async () => {
    axiosMock.mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      data: { result: { sys_id: '123', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' } },
    });

    const res = await serviceNow.createIncident({
      short_description: 'A title',
      description: 'A description',
      caller_id: '123',
    });
    const [url, { method, data }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl('api/now/v2/table/incident'));
    expect(method).toEqual('post');
    expect(data).toEqual({
      short_description: 'A title',
      description: 'A description',
      caller_id: '123',
    });

    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('update incident', async () => {
    axiosMock.mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      data: { result: { sys_id: '123', number: 'INC01', sys_updated_on: '2020-03-10 12:24:20' } },
    });

    const res = await serviceNow.updateIncident('123', {
      short_description: params.title,
    });
    const [url, { method, data }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl(`api/now/v2/table/incident/123`));
    expect(method).toEqual('patch');
    expect(data).toEqual({ short_description: params.title });
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('create comment', async () => {
    axiosMock.mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      data: { result: { sys_updated_on: '2020-03-10 12:24:20' } },
    });

    const comment = {
      commentId: '456',
      version: 'WzU3LDFd',
      comment: 'A comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: null,
      updatedBy: null,
    };

    const res = await serviceNow.createComment('123', comment, 'comments');

    const [url, { method, data }] = axiosMock.mock.calls[0];

    expect(url).toEqual(prependInstanceUrl(`api/now/v2/table/incident/123`));
    expect(method).toEqual('patch');
    expect(data).toEqual({
      comments: 'A comment',
    });

    expect(res).toEqual({
      commentId: '456',
      pushedDate: '2020-03-10T12:24:20.000Z',
    });
  });

  test('create batch comment', async () => {
    axiosMock.mockReturnValueOnce({
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      data: { result: { sys_updated_on: '2020-03-10 12:24:20' } },
    });

    axiosMock.mockReturnValueOnce({
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
      data: { result: { sys_updated_on: '2020-03-10 12:25:20' } },
    });

    const comments = [
      {
        commentId: '123',
        version: 'WzU3LDFd',
        comment: 'A comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
      {
        commentId: '456',
        version: 'WzU3LDFd',
        comment: 'A second comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ];
    const res = await serviceNow.batchCreateComments('000', comments, 'comments');

    comments.forEach((comment, index) => {
      const [url, { method, data }] = axiosMock.mock.calls[index];
      expect(url).toEqual(prependInstanceUrl('api/now/v2/table/incident/000'));
      expect(method).toEqual('patch');
      expect(data).toEqual({
        comments: comment.comment,
      });
      expect(res).toEqual([
        { commentId: '123', pushedDate: '2020-03-10T12:24:20.000Z' },
        { commentId: '456', pushedDate: '2020-03-10T12:25:20.000Z' },
      ]);
    });
  });

  test('throw if not status is not ok', async () => {
    expect.assertions(1);

    axiosMock.mockResolvedValue({
      status: 401,
      headers: {
        'content-type': 'application/json',
      },
    });
    try {
      await serviceNow.getUserID();
    } catch (error) {
      expect(error.message).toEqual(
        '[Action][ServiceNow]: Unable to get user id. Error: [ServiceNow]: Instance is not alive.'
      );
    }
  });

  test('throw if not content-type is not application/json', async () => {
    expect.assertions(1);

    axiosMock.mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'application/html',
      },
    });
    try {
      await serviceNow.getUserID();
    } catch (error) {
      expect(error.message).toEqual(
        '[Action][ServiceNow]: Unable to get user id. Error: [ServiceNow]: Instance is not alive.'
      );
    }
  });

  test('check error when getting user', async () => {
    expect.assertions(1);

    axiosMock.mockImplementationOnce(() => {
      throw new Error('Bad request.');
    });
    try {
      await serviceNow.getUserID();
    } catch (error) {
      expect(error.message).toEqual(
        '[Action][ServiceNow]: Unable to get user id. Error: Bad request.'
      );
    }
  });

  test('check error when getting incident', async () => {
    expect.assertions(1);

    axiosMock.mockImplementationOnce(() => {
      throw new Error('Bad request.');
    });
    try {
      await serviceNow.getIncident('123');
    } catch (error) {
      expect(error.message).toEqual(
        '[Action][ServiceNow]: Unable to get incident with id 123. Error: Bad request.'
      );
    }
  });

  test('check error when creating incident', async () => {
    expect.assertions(1);

    axiosMock.mockImplementationOnce(() => {
      throw new Error('Bad request.');
    });
    try {
      await serviceNow.createIncident({ short_description: 'title' });
    } catch (error) {
      expect(error.message).toEqual(
        '[Action][ServiceNow]: Unable to create incident. Error: Bad request.'
      );
    }
  });

  test('check error when updating incident', async () => {
    expect.assertions(1);

    axiosMock.mockImplementationOnce(() => {
      throw new Error('Bad request.');
    });
    try {
      await serviceNow.updateIncident('123', { short_description: 'title' });
    } catch (error) {
      expect(error.message).toEqual(
        '[Action][ServiceNow]: Unable to update incident with id 123. Error: Bad request.'
      );
    }
  });

  test('check error when creating comment', async () => {
    expect.assertions(1);

    axiosMock.mockImplementationOnce(() => {
      throw new Error('Bad request.');
    });
    try {
      await serviceNow.createComment(
        '123',
        {
          commentId: '456',
          version: 'WzU3LDFd',
          comment: 'A second comment',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: { fullName: 'Elastic User', username: 'elastic' },
          updatedAt: null,
          updatedBy: null,
        },
        'comment'
      );
    } catch (error) {
      expect(error.message).toEqual(
        '[Action][ServiceNow]: Unable to create comment at incident with id 123. Error: Bad request.'
      );
    }
  });
});

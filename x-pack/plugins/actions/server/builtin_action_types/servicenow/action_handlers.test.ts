/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  handleCreateIncident,
  handleUpdateIncident,
  handleIncident,
  createComments,
} from './action_handlers';
import { ServiceNow } from './lib';
import { Mapping } from './types';

jest.mock('./lib');

const ServiceNowMock = ServiceNow as jest.Mock;

const finalMapping: Mapping = new Map();

finalMapping.set('title', {
  target: 'short_description',
  actionType: 'overwrite',
});

finalMapping.set('description', {
  target: 'description',
  actionType: 'overwrite',
});

finalMapping.set('comments', {
  target: 'comments',
  actionType: 'append',
});

finalMapping.set('short_description', {
  target: 'title',
  actionType: 'overwrite',
});

const params = {
  caseId: '123',
  title: 'a title',
  description: 'a description',
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: null,
  updatedBy: null,
  incidentId: null,
  incident: {
    short_description: 'a title',
    description: 'a description',
  },
  comments: [
    {
      commentId: '456',
      version: 'WzU3LDFd',
      comment: 'first comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: null,
      updatedBy: null,
    },
  ],
};

beforeAll(() => {
  ServiceNowMock.mockImplementation(() => {
    return {
      serviceNow: {
        getUserID: jest.fn().mockResolvedValue('1234'),
        getIncident: jest.fn().mockResolvedValue({
          short_description: 'servicenow title',
          description: 'servicenow desc',
        }),
        createIncident: jest.fn().mockResolvedValue({
          incidentId: '123',
          number: 'INC01',
          pushedDate: '2020-03-10T12:24:20.000Z',
          url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        }),
        updateIncident: jest.fn().mockResolvedValue({
          incidentId: '123',
          number: 'INC01',
          pushedDate: '2020-03-10T12:24:20.000Z',
          url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        }),
        batchCreateComments: jest
          .fn()
          .mockResolvedValue([{ commentId: '456', pushedDate: '2020-03-10T12:24:20.000Z' }]),
      },
    };
  });
});

describe('handleIncident', () => {
  test('create an incident', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleIncident({
      incidentId: null,
      serviceNow,
      params,
      comments: params.comments,
      mapping: finalMapping,
    });
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      comments: [
        {
          commentId: '456',
          pushedDate: '2020-03-10T12:24:20.000Z',
        },
      ],
    });
  });
  test('update an incident', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: params.comments,
      mapping: finalMapping,
    });
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      comments: [
        {
          commentId: '456',
          pushedDate: '2020-03-10T12:24:20.000Z',
        },
      ],
    });
  });
});

describe('handleCreateIncident', () => {
  test('create an incident without comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleCreateIncident({
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.createIncident).toHaveBeenCalled();
    expect(serviceNow.createIncident).toHaveBeenCalledWith({
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.createIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('create an incident with comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleCreateIncident({
      serviceNow,
      params,
      comments: params.comments,
      mapping: finalMapping,
    });

    expect(serviceNow.createIncident).toHaveBeenCalled();
    expect(serviceNow.createIncident).toHaveBeenCalledWith({
      description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.createIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).toHaveBeenCalled();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith(
      '123',
      [
        {
          comment: 'first comment (added at 2020-03-13T08:34:53.450Z by Elastic User)',
          commentId: '456',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          updatedAt: null,
          updatedBy: null,
          version: 'WzU3LDFd',
        },
      ],
      'comments'
    );
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      comments: [
        {
          commentId: '456',
          pushedDate: '2020-03-10T12:24:20.000Z',
        },
      ],
    });
  });
});

describe('handleUpdateIncident', () => {
  test('update an incident without comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: {
        ...params,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { fullName: 'Another User', username: 'anotherUser' },
      },
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      short_description: 'a title (updated at 2020-03-15T08:34:53.450Z by Another User)',
      description: 'a description (updated at 2020-03-15T08:34:53.450Z by Another User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('update an incident with comments', async () => {
    const { serviceNow } = new ServiceNowMock();
    serviceNow.batchCreateComments.mockResolvedValue([
      { commentId: '456', pushedDate: '2020-03-10T12:24:20.000Z' },
      { commentId: '789', pushedDate: '2020-03-10T12:24:20.000Z' },
    ]);

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: {
        ...params,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { fullName: 'Another User', username: 'anotherUser' },
      },
      comments: [
        {
          comment: 'first comment',
          commentId: '456',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          updatedAt: null,
          updatedBy: null,
          version: 'WzU3LDFd',
        },
        {
          comment: 'second comment',
          commentId: '789',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          updatedAt: '2020-03-16T08:34:53.450Z',
          updatedBy: {
            fullName: 'Another User',
            username: 'anotherUser',
          },
          version: 'WzU3LDFd',
        },
      ],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      description: 'a description (updated at 2020-03-15T08:34:53.450Z by Another User)',
      short_description: 'a title (updated at 2020-03-15T08:34:53.450Z by Another User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).toHaveBeenCalled();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith(
      '123',
      [
        {
          comment: 'first comment (added at 2020-03-13T08:34:53.450Z by Elastic User)',
          commentId: '456',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          updatedAt: null,
          updatedBy: null,
          version: 'WzU3LDFd',
        },
        {
          comment: 'second comment (added at 2020-03-16T08:34:53.450Z by Another User)',
          commentId: '789',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          updatedAt: '2020-03-16T08:34:53.450Z',
          updatedBy: {
            fullName: 'Another User',
            username: 'anotherUser',
          },
          version: 'WzU3LDFd',
        },
      ],
      'comments'
    );
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      comments: [
        {
          commentId: '456',
          pushedDate: '2020-03-10T12:24:20.000Z',
        },
        {
          commentId: '789',
          pushedDate: '2020-03-10T12:24:20.000Z',
        },
      ],
    });
  });
});

describe('handleUpdateIncident: different action types', () => {
  test('overwrite & append', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'overwrite',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'append',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'overwrite',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      short_description: 'a title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
      description:
        'servicenow desc \r\na description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('nothing & append', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'nothing',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'append',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'nothing',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      description:
        'servicenow desc \r\na description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('append & append', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'append',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'append',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'append',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      short_description:
        'servicenow title \r\na title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
      description:
        'servicenow desc \r\na description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('nothing & nothing', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'nothing',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'nothing',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'nothing',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {});
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('overwrite & nothing', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'overwrite',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'nothing',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'overwrite',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      short_description: 'a title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('overwrite & overwrite', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'overwrite',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'overwrite',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'overwrite',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      short_description: 'a title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('nothing & overwrite', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'nothing',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'overwrite',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'nothing',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      description: 'a description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('append & overwrite', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'append',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'overwrite',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'append',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      short_description:
        'servicenow title \r\na title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });

  test('append & nothing', async () => {
    const { serviceNow } = new ServiceNowMock();
    finalMapping.set('title', {
      target: 'short_description',
      actionType: 'append',
    });

    finalMapping.set('description', {
      target: 'description',
      actionType: 'nothing',
    });

    finalMapping.set('comments', {
      target: 'comments',
      actionType: 'append',
    });

    finalMapping.set('short_description', {
      target: 'title',
      actionType: 'append',
    });

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', {
      short_description:
        'servicenow title \r\na title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
    });
  });
});

describe('createComments', () => {
  test('create comments correctly', async () => {
    const { serviceNow } = new ServiceNowMock();
    serviceNow.batchCreateComments.mockResolvedValue([
      { commentId: '456', pushedDate: '2020-03-10T12:24:20.000Z' },
      { commentId: '789', pushedDate: '2020-03-10T12:24:20.000Z' },
    ]);

    const comments = [
      {
        comment: 'first comment',
        commentId: '456',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: {
          fullName: 'Elastic User',
          username: 'elastic',
        },
        updatedAt: null,
        updatedBy: null,
        version: 'WzU3LDFd',
      },
      {
        comment: 'second comment',
        commentId: '789',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: {
          fullName: 'Elastic User',
          username: 'elastic',
        },
        updatedAt: '2020-03-13T08:34:53.450Z',
        updatedBy: {
          fullName: 'Elastic User',
          username: 'elastic',
        },
        version: 'WzU3LDFd',
      },
    ];

    const res = await createComments(serviceNow, '123', 'comments', comments);

    expect(serviceNow.batchCreateComments).toHaveBeenCalled();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith(
      '123',
      [
        {
          comment: 'first comment',
          commentId: '456',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          updatedAt: null,
          updatedBy: null,
          version: 'WzU3LDFd',
        },
        {
          comment: 'second comment',
          commentId: '789',
          createdAt: '2020-03-13T08:34:53.450Z',
          createdBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          updatedAt: '2020-03-13T08:34:53.450Z',
          updatedBy: {
            fullName: 'Elastic User',
            username: 'elastic',
          },
          version: 'WzU3LDFd',
        },
      ],
      'comments'
    );
    expect(res).toEqual([
      {
        commentId: '456',
        pushedDate: '2020-03-10T12:24:20.000Z',
      },
      {
        commentId: '789',
        pushedDate: '2020-03-10T12:24:20.000Z',
      },
    ]);
  });
});

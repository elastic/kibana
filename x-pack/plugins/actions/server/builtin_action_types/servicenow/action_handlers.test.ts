/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleCreateIncident, handleUpdateIncident } from './action_handlers';
import { ServiceNow } from './lib';
import { finalMapping } from './mock';
import { Incident } from './lib/types';

jest.mock('./lib');

const ServiceNowMock = ServiceNow as jest.Mock;

const incident: Incident = {
  short_description: 'A title',
  description: 'A description',
};

const comments = [
  {
    commentId: '456',
    version: 'WzU3LDFd',
    comment: 'A comment',
    incidentCommentId: undefined,
  },
];

describe('handleCreateIncident', () => {
  beforeAll(() => {
    ServiceNowMock.mockImplementation(() => {
      return {
        serviceNow: {
          getUserID: jest.fn().mockResolvedValue('1234'),
          createIncident: jest.fn().mockResolvedValue({
            incidentId: '123',
            number: 'INC01',
            pushedDate: '2020-03-10T12:24:20.000Z',
          }),
          updateIncident: jest.fn().mockResolvedValue({
            incidentId: '123',
            number: 'INC01',
            pushedDate: '2020-03-10T12:24:20.000Z',
          }),
          batchCreateComments: jest
            .fn()
            .mockResolvedValue([{ commentId: '456', pushedDate: '2020-03-10T12:24:20.000Z' }]),
          batchUpdateComments: jest
            .fn()
            .mockResolvedValue([{ commentId: '456', pushedDate: '2020-03-10T12:24:20.000Z' }]),
        },
      };
    });
  });

  test('create an incident without comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleCreateIncident({
      serviceNow,
      params: incident,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.createIncident).toHaveBeenCalled();
    expect(serviceNow.createIncident).toHaveBeenCalledWith(incident);
    expect(serviceNow.createIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
    });
  });

  test('create an incident with comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleCreateIncident({
      serviceNow,
      params: incident,
      comments,
      mapping: finalMapping,
    });

    expect(serviceNow.createIncident).toHaveBeenCalled();
    expect(serviceNow.createIncident).toHaveBeenCalledWith(incident);
    expect(serviceNow.createIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).toHaveBeenCalled();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith('123', comments, 'comments');
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      comments: [
        {
          commentId: '456',
          pushedDate: '2020-03-10T12:24:20.000Z',
        },
      ],
    });
  });

  test('update an incident without comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: incident,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', incident);
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchUpdateComments).not.toHaveBeenCalled();
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
    });
  });

  test('update an incident and create new comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: incident,
      comments,
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', incident);
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchUpdateComments).not.toHaveBeenCalled();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith('123', comments, 'comments');

    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      pushedDate: '2020-03-10T12:24:20.000Z',
      comments: [
        {
          commentId: '456',
          pushedDate: '2020-03-10T12:24:20.000Z',
        },
      ],
    });
  });
});

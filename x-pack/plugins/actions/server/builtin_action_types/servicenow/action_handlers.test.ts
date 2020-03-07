/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleCreateIncident, handleUpdateIncident } from './action_handlers';
import { ServiceNow } from '../lib/servicenow';
import { finalMapping } from './mock';
import { Incident } from '../lib/servicenow/types';

jest.mock('../lib/servicenow');

const ServiceNowMock = ServiceNow as jest.Mock;

const incident: Incident = {
  short_description: 'A title',
  description: 'A description',
};

const commentsToCreate = [
  {
    commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
    version: 'WzU3LDFd',
    comment: 'A comment',
    incidentCommentId: undefined,
  },
];

const commentsToUpdate = [
  {
    commentId: '3e869fc0-4d1a-11ea-bace-d9629f4c49ff',
    version: 'WzU3LDFd',
    comment: 'A comment',
    incidentCommentId: '333c0583075f00100e48fbbf7c1ed05d',
  },
];

describe('handleCreateIncident', () => {
  beforeAll(() => {
    ServiceNowMock.mockImplementation(() => {
      return {
        serviceNow: {
          getUserID: jest.fn().mockResolvedValue('1234'),
          createIncident: jest.fn().mockResolvedValue({ incidentId: '123', number: 'INC01' }),
          updateIncident: jest.fn().mockResolvedValue({ incidentId: '123', number: 'INC01' }),
          batchCreateComments: jest
            .fn()
            .mockResolvedValue([{ commentId: '133c78cf071f00100e48fbbf7c1ed0f2' }]),
          batchUpdateComments: jest
            .fn()
            .mockResolvedValue([{ commentId: '333c0583075f00100e48fbbf7c1ed05d' }]),
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
    expect(res).toEqual({ incidentId: '123', number: 'INC01' });
  });

  test('create an incident with comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleCreateIncident({
      serviceNow,
      params: incident,
      comments: commentsToCreate,
      mapping: finalMapping,
    });

    expect(serviceNow.createIncident).toHaveBeenCalled();
    expect(serviceNow.createIncident).toHaveBeenCalledWith(incident);
    expect(serviceNow.createIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).toHaveBeenCalled();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith(
      '123',
      commentsToCreate,
      'comments'
    );
    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      comments: [
        {
          commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
          incidentCommentId: '133c78cf071f00100e48fbbf7c1ed0f2',
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
    expect(res).toEqual({ incidentId: '123', number: 'INC01' });
  });

  test('update an incident and create new comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: incident,
      comments: commentsToCreate,
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', incident);
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchUpdateComments).not.toHaveBeenCalled();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith(
      '123',
      commentsToCreate,
      'comments'
    );

    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      comments: [
        {
          commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
          incidentCommentId: '133c78cf071f00100e48fbbf7c1ed0f2',
        },
      ],
    });
  });

  test('update an incident and update comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: incident,
      comments: commentsToUpdate,
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', incident);
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).not.toHaveBeenCalled();
    expect(serviceNow.batchUpdateComments).toHaveBeenCalledWith(commentsToUpdate);

    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      comments: [
        {
          commentId: '3e869fc0-4d1a-11ea-bace-d9629f4c49ff',
          incidentCommentId: '333c0583075f00100e48fbbf7c1ed05d',
        },
      ],
    });
  });

  test('update an incident, create and update comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    const res = await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: incident,
      comments: [...commentsToCreate, ...commentsToUpdate],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', incident);
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchCreateComments).toHaveBeenCalledWith(
      '123',
      commentsToCreate,
      'comments'
    );
    expect(serviceNow.batchUpdateComments).toHaveBeenCalledWith(commentsToUpdate);

    expect(res).toEqual({
      incidentId: '123',
      number: 'INC01',
      comments: [
        {
          commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
          incidentCommentId: '133c78cf071f00100e48fbbf7c1ed0f2',
        },
        {
          commentId: '3e869fc0-4d1a-11ea-bace-d9629f4c49ff',
          incidentCommentId: '333c0583075f00100e48fbbf7c1ed05d',
        },
      ],
    });
  });
});

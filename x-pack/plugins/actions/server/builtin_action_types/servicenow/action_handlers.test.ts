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

const comments = [
  {
    commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
    version: 'WzU3LDFd',
    comment: 'A comment',
    incidentCommentId: '263ede42075300100e48fbbf7c1ed047',
  },
  {
    commentId: 'e3db587f-ca27-4ae9-ad2e-31f2dcc9bd0d',
    version: 'WlK3LDFd',
    comment: 'Another comment',
    incidentCommentId: '315e1ece071300100e48fbbf7c1ed0d0',
  },
];

describe('handleCreateIncident', () => {
  beforeAll(() => {
    ServiceNowMock.mockImplementation(() => {
      return {
        serviceNow: {
          getUserID: jest.fn().mockResolvedValue('1234'),
          createIncident: jest.fn().mockResolvedValue({ id: '123', number: 'INC01' }),
          updateIncident: jest.fn(),
          batchAddComments: jest.fn(),
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
    expect(serviceNow.batchAddComments).not.toHaveBeenCalled();
    expect(res).toEqual({ id: '123', number: 'INC01' });
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
    expect(serviceNow.batchAddComments).toHaveBeenCalled();
    expect(serviceNow.batchAddComments).toHaveBeenCalledWith(
      '123',
      comments.map(c => c.comment),
      'comments'
    );
    expect(res).toEqual({ id: '123', number: 'INC01' });
  });

  test('update an incident without comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: incident,
      comments: [],
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', incident);
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchAddComments).not.toHaveBeenCalled();
  });

  test('update an incident with comments', async () => {
    const { serviceNow } = new ServiceNowMock();

    await handleUpdateIncident({
      incidentId: '123',
      serviceNow,
      params: incident,
      comments,
      mapping: finalMapping,
    });

    expect(serviceNow.updateIncident).toHaveBeenCalled();
    expect(serviceNow.updateIncident).toHaveBeenCalledWith('123', incident);
    expect(serviceNow.updateIncident).toHaveReturned();
    expect(serviceNow.batchAddComments).toHaveBeenCalledWith(
      '123',
      comments.map(c => c.comment),
      'comments'
    );
  });
});

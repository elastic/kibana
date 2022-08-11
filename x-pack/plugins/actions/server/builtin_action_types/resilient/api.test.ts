/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { api } from './api';
import { externalServiceMock, apiParams } from './mocks';
import { ExternalService } from './types';

let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pushToService', () => {
    describe('create incident', () => {
      test('it creates an incident', async () => {
        const params = { ...apiParams, externalId: null };
        const res = await api.pushToService({
          externalService,
          params,
          logger: mockedLogger,
        });

        expect(res).toEqual({
          id: '1',
          title: '1',
          pushedDate: '2020-06-03T15:09:13.606Z',
          url: 'https://resilient.elastic.co/#incidents/1',
          comments: [
            {
              commentId: 'case-comment-1',
              pushedDate: '2020-06-03T15:09:13.606Z',
            },
            {
              commentId: 'case-comment-2',
              pushedDate: '2020-06-03T15:09:13.606Z',
            },
          ],
        });
      });

      test('it creates an incident without comments', async () => {
        const params = { ...apiParams, externalId: null, comments: [] };
        const res = await api.pushToService({
          externalService,
          params,
          logger: mockedLogger,
        });

        expect(res).toEqual({
          id: '1',
          title: '1',
          pushedDate: '2020-06-03T15:09:13.606Z',
          url: 'https://resilient.elastic.co/#incidents/1',
        });
      });

      test('it calls createIncident correctly', async () => {
        const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
        await api.pushToService({ externalService, params, logger: mockedLogger });

        expect(externalService.createIncident).toHaveBeenCalledWith({
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            description: 'Incident description',
            name: 'Incident title',
          },
        });
        expect(externalService.updateIncident).not.toHaveBeenCalled();
      });

      test('it calls createComment correctly', async () => {
        const params = { ...apiParams, externalId: null };
        await api.pushToService({ externalService, params, logger: mockedLogger });
        expect(externalService.createComment).toHaveBeenCalledTimes(2);
        expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-1',
            comment: 'A comment',
          },
        });

        expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-2',
            comment: 'Another comment',
          },
        });
      });
    });

    describe('update incident', () => {
      test('it updates an incident', async () => {
        const res = await api.pushToService({
          externalService,
          params: apiParams,
          logger: mockedLogger,
        });

        expect(res).toEqual({
          id: '1',
          title: '1',
          pushedDate: '2020-06-03T15:09:13.606Z',
          url: 'https://resilient.elastic.co/#incidents/1',
          comments: [
            {
              commentId: 'case-comment-1',
              pushedDate: '2020-06-03T15:09:13.606Z',
            },
            {
              commentId: 'case-comment-2',
              pushedDate: '2020-06-03T15:09:13.606Z',
            },
          ],
        });
      });

      test('it updates an incident without comments', async () => {
        const params = { ...apiParams, comments: [] };
        const res = await api.pushToService({
          externalService,
          params,
          logger: mockedLogger,
        });

        expect(res).toEqual({
          id: '1',
          title: '1',
          pushedDate: '2020-06-03T15:09:13.606Z',
          url: 'https://resilient.elastic.co/#incidents/1',
        });
      });

      test('it calls updateIncident correctly', async () => {
        const params = { ...apiParams };
        await api.pushToService({ externalService, params, logger: mockedLogger });

        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            description: 'Incident description',
            name: 'Incident title',
          },
        });
        expect(externalService.createIncident).not.toHaveBeenCalled();
      });

      test('it calls createComment correctly', async () => {
        const params = { ...apiParams };
        await api.pushToService({ externalService, params, logger: mockedLogger });
        expect(externalService.createComment).toHaveBeenCalledTimes(2);
        expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-1',
            comment: 'A comment',
          },
        });

        expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-2',
            comment: 'Another comment',
          },
        });
      });
    });

    describe('incidentTypes', () => {
      test('it returns the incident types correctly', async () => {
        const res = await api.incidentTypes({
          externalService,
          params: {},
        });
        expect(res).toEqual([
          { id: 17, name: 'Communication error (fax; email)' },
          { id: 1001, name: 'Custom type' },
        ]);
      });
    });

    describe('severity', () => {
      test('it returns the severity correctly', async () => {
        const res = await api.severity({
          externalService,
          params: { id: '10006' },
        });
        expect(res).toEqual([
          { id: 4, name: 'Low' },
          { id: 5, name: 'Medium' },
          { id: 6, name: 'High' },
        ]);
      });
    });
  });
});

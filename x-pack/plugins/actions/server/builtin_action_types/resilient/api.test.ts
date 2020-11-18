/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { api } from './api';
import { externalServiceMock, mapping, apiParams } from './mocks';
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
          mapping,
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
          mapping,
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
        const params = { ...apiParams, externalId: null };
        await api.pushToService({ externalService, mapping, params, logger: mockedLogger });

        expect(externalService.createIncident).toHaveBeenCalledWith({
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            description:
              'Incident description (created at 2020-06-03T15:09:13.606Z by Elastic User)',
            name: 'Incident title (created at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
        expect(externalService.updateIncident).not.toHaveBeenCalled();
      });

      test('it calls createComment correctly', async () => {
        const params = { ...apiParams, externalId: null };
        await api.pushToService({ externalService, mapping, params, logger: mockedLogger });
        expect(externalService.createComment).toHaveBeenCalledTimes(2);
        expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-1',
            comment: 'A comment (added at 2020-06-03T15:09:13.606Z by Elastic User)',
            createdAt: '2020-06-03T15:09:13.606Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-06-03T15:09:13.606Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
          },
        });

        expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-2',
            comment: 'Another comment (added at 2020-06-03T15:09:13.606Z by Elastic User)',
            createdAt: '2020-06-03T15:09:13.606Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-06-03T15:09:13.606Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
          },
        });
      });
    });

    describe('update incident', () => {
      test('it updates an incident', async () => {
        const res = await api.pushToService({
          externalService,
          mapping,
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
          mapping,
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
        await api.pushToService({ externalService, mapping, params, logger: mockedLogger });

        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            description:
              'Incident description (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
            name: 'Incident title (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
        expect(externalService.createIncident).not.toHaveBeenCalled();
      });

      test('it calls createComment correctly', async () => {
        const params = { ...apiParams };
        await api.pushToService({ externalService, mapping, params, logger: mockedLogger });
        expect(externalService.createComment).toHaveBeenCalledTimes(2);
        expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-1',
            comment: 'A comment (added at 2020-06-03T15:09:13.606Z by Elastic User)',
            createdAt: '2020-06-03T15:09:13.606Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-06-03T15:09:13.606Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
          },
        });

        expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
          incidentId: '1',
          comment: {
            commentId: 'case-comment-2',
            comment: 'Another comment (added at 2020-06-03T15:09:13.606Z by Elastic User)',
            createdAt: '2020-06-03T15:09:13.606Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-06-03T15:09:13.606Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
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
          {
            id: 17,
            name: 'Communication error (fax; email)',
          },
          {
            id: 1001,
            name: 'Custom type',
          },
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
          {
            id: 4,
            name: 'Low',
          },
          {
            id: 5,
            name: 'Medium',
          },
          {
            id: 6,
            name: 'High',
          },
        ]);
      });
    });

    describe('mapping variations', () => {
      test('overwrite & append', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'overwrite',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'append',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            name: 'Incident title (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
            description:
              'description from ibm resilient \r\nIncident description (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('nothing & append', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'nothing',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'append',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            description:
              'description from ibm resilient \r\nIncident description (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('append & append', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'append',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'append',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            name:
              'title from ibm resilient \r\nIncident title (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
            description:
              'description from ibm resilient \r\nIncident description (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('nothing & nothing', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'nothing',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'nothing',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
          },
        });
      });

      test('overwrite & nothing', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'overwrite',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'nothing',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            name: 'Incident title (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('overwrite & overwrite', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'overwrite',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'overwrite',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            name: 'Incident title (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
            description:
              'Incident description (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('nothing & overwrite', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'nothing',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'overwrite',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            description:
              'Incident description (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('append & overwrite', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'append',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'overwrite',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            name:
              'title from ibm resilient \r\nIncident title (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
            description:
              'Incident description (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('append & nothing', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'append',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'nothing',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'append',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            incidentTypes: [1001],
            severityCode: 6,
            name:
              'title from ibm resilient \r\nIncident title (updated at 2020-06-03T15:09:13.606Z by Elastic User)',
          },
        });
      });

      test('comment nothing', async () => {
        mapping.set('title', {
          target: 'name',
          actionType: 'overwrite',
        });

        mapping.set('description', {
          target: 'description',
          actionType: 'nothing',
        });

        mapping.set('comments', {
          target: 'comments',
          actionType: 'nothing',
        });

        mapping.set('name', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          logger: mockedLogger,
        });
        expect(externalService.createComment).not.toHaveBeenCalled();
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { api } from '../case/api';
import { externalServiceMock, mapping, apiParams } from './mocks';
import { ExternalService } from '../case/types';

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
        const res = await api.pushToService({ externalService, mapping, params });

        expect(res).toEqual({
          id: 'incident-1',
          title: 'CK-1',
          pushedDate: '2020-04-27T10:59:46.202Z',
          url: 'https://siem-kibana.atlassian.net/browse/CK-1',
          comments: [
            {
              commentId: 'case-comment-1',
              pushedDate: '2020-04-27T10:59:46.202Z',
            },
            {
              commentId: 'case-comment-2',
              pushedDate: '2020-04-27T10:59:46.202Z',
            },
          ],
        });
      });

      test('it creates an incident without comments', async () => {
        const params = { ...apiParams, externalId: null, comments: [] };
        const res = await api.pushToService({ externalService, mapping, params });

        expect(res).toEqual({
          id: 'incident-1',
          title: 'CK-1',
          pushedDate: '2020-04-27T10:59:46.202Z',
          url: 'https://siem-kibana.atlassian.net/browse/CK-1',
        });
      });

      test('it calls createIncident correctly', async () => {
        const params = { ...apiParams, externalId: null };
        await api.pushToService({ externalService, mapping, params });

        expect(externalService.createIncident).toHaveBeenCalledWith({
          incident: {
            description:
              'Incident description (created at 2020-04-27T10:59:46.202Z by Elastic User)',
            summary: 'Incident title (created at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
        expect(externalService.updateIncident).not.toHaveBeenCalled();
      });

      test('it calls createComment correctly', async () => {
        const params = { ...apiParams, externalId: null };
        await api.pushToService({ externalService, mapping, params });
        expect(externalService.createComment).toHaveBeenCalledTimes(2);
        expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
          incidentId: 'incident-1',
          comment: {
            commentId: 'case-comment-1',
            comment: 'A comment (added at 2020-04-27T10:59:46.202Z by Elastic User)',
            createdAt: '2020-04-27T10:59:46.202Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-04-27T10:59:46.202Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
          },
          field: 'comments',
        });

        expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
          incidentId: 'incident-1',
          comment: {
            commentId: 'case-comment-2',
            comment: 'Another comment (added at 2020-04-27T10:59:46.202Z by Elastic User)',
            createdAt: '2020-04-27T10:59:46.202Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-04-27T10:59:46.202Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
          },
          field: 'comments',
        });
      });
    });

    describe('update incident', () => {
      test('it updates an incident', async () => {
        const res = await api.pushToService({ externalService, mapping, params: apiParams });

        expect(res).toEqual({
          id: 'incident-1',
          title: 'CK-1',
          pushedDate: '2020-04-27T10:59:46.202Z',
          url: 'https://siem-kibana.atlassian.net/browse/CK-1',
          comments: [
            {
              commentId: 'case-comment-1',
              pushedDate: '2020-04-27T10:59:46.202Z',
            },
            {
              commentId: 'case-comment-2',
              pushedDate: '2020-04-27T10:59:46.202Z',
            },
          ],
        });
      });

      test('it updates an incident without comments', async () => {
        const params = { ...apiParams, comments: [] };
        const res = await api.pushToService({ externalService, mapping, params });

        expect(res).toEqual({
          id: 'incident-1',
          title: 'CK-1',
          pushedDate: '2020-04-27T10:59:46.202Z',
          url: 'https://siem-kibana.atlassian.net/browse/CK-1',
        });
      });

      test('it calls updateIncident correctly', async () => {
        const params = { ...apiParams };
        await api.pushToService({ externalService, mapping, params });

        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            description:
              'Incident description (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
            summary: 'Incident title (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
        expect(externalService.createIncident).not.toHaveBeenCalled();
      });

      test('it calls createComment correctly', async () => {
        const params = { ...apiParams };
        await api.pushToService({ externalService, mapping, params });
        expect(externalService.createComment).toHaveBeenCalledTimes(2);
        expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
          incidentId: 'incident-1',
          comment: {
            commentId: 'case-comment-1',
            comment: 'A comment (added at 2020-04-27T10:59:46.202Z by Elastic User)',
            createdAt: '2020-04-27T10:59:46.202Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-04-27T10:59:46.202Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
          },
          field: 'comments',
        });

        expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
          incidentId: 'incident-1',
          comment: {
            commentId: 'case-comment-2',
            comment: 'Another comment (added at 2020-04-27T10:59:46.202Z by Elastic User)',
            createdAt: '2020-04-27T10:59:46.202Z',
            createdBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
            updatedAt: '2020-04-27T10:59:46.202Z',
            updatedBy: {
              fullName: 'Elastic User',
              username: 'elastic',
            },
          },
          field: 'comments',
        });
      });
    });

    describe('mapping variations', () => {
      test('overwrite & append', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            summary: 'Incident title (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
            description:
              'description from jira \r\nIncident description (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('nothing & append', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            description:
              'description from jira \r\nIncident description (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('append & append', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            summary:
              'title from jira \r\nIncident title (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
            description:
              'description from jira \r\nIncident description (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('nothing & nothing', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {},
        });
      });

      test('overwrite & nothing', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            summary: 'Incident title (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('overwrite & overwrite', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            summary: 'Incident title (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
            description:
              'Incident description (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('nothing & overwrite', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            description:
              'Incident description (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('append & overwrite', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            summary:
              'title from jira \r\nIncident title (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
            description:
              'Incident description (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('append & nothing', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            summary:
              'title from jira \r\nIncident title (updated at 2020-04-27T10:59:46.202Z by Elastic User)',
          },
        });
      });

      test('comment nothing', async () => {
        mapping.set('title', {
          target: 'summary',
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

        mapping.set('summary', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({ externalService, mapping, params: apiParams });
        expect(externalService.createComment).not.toHaveBeenCalled();
      });
    });
  });
});

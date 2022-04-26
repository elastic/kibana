/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { externalServiceMock, apiParams } from './mocks';
import { ExternalService } from './types';
import { api } from './api';
let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
  });

  describe('create incident - cases', () => {
    test('it creates an incident', async () => {
      const params = { ...apiParams, externalId: null };
      const res = await api.pushToService({
        externalService,
        params,
        logger: mockedLogger,
      });

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
      const res = await api.pushToService({
        externalService,
        params,
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      });
    });

    test('it calls createIncident correctly', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.createIncident).toHaveBeenCalledWith({
        incident: {
          labels: ['kibana', 'elastic'],
          priority: 'High',
          issueType: '10006',
          parent: null,
          description: 'Incident description',
          summary: 'Incident title',
        },
      });
      expect(externalService.updateIncident).not.toHaveBeenCalled();
    });

    test('it calls createIncident correctly without mapping', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.createIncident).toHaveBeenCalledWith({
        incident: {
          description: 'Incident description',
          summary: 'Incident title',
          issueType: '10006',
          labels: ['kibana', 'elastic'],
          priority: 'High',
          parent: null,
        },
      });
      expect(externalService.updateIncident).not.toHaveBeenCalled();
    });

    test('it calls createComment correctly', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });
      expect(externalService.createComment).toHaveBeenCalledTimes(2);
      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-2',
          comment: 'Another comment',
        },
      });
    });

    test('it calls createComment correctly without mapping', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });
      expect(externalService.createComment).toHaveBeenCalledTimes(2);
      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        incidentId: 'incident-1',
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
      const res = await api.pushToService({
        externalService,
        params,
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      });
    });

    test('it calls updateIncident correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.updateIncident).toHaveBeenCalledWith({
        incidentId: 'incident-3',
        incident: {
          labels: ['kibana', 'elastic'],
          priority: 'High',
          issueType: '10006',
          parent: null,
          description: 'Incident description',
          summary: 'Incident title',
        },
      });
      expect(externalService.createIncident).not.toHaveBeenCalled();
    });

    test('it calls updateIncident correctly without mapping', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.updateIncident).toHaveBeenCalledWith({
        incidentId: 'incident-3',
        incident: {
          description: 'Incident description',
          summary: 'Incident title',
          issueType: '10006',
          labels: ['kibana', 'elastic'],
          priority: 'High',
          parent: null,
        },
      });
      expect(externalService.createIncident).not.toHaveBeenCalled();
    });

    test('it calls createComment correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });
      expect(externalService.createComment).toHaveBeenCalledTimes(2);
      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-2',
          comment: 'Another comment',
        },
      });
    });

    test('it calls createComment correctly without mapping', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });
      expect(externalService.createComment).toHaveBeenCalledTimes(2);
      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-2',
          comment: 'Another comment',
        },
      });
    });
  });

  describe('issueTypes', () => {
    test('it returns the issue types correctly', async () => {
      const res = await api.issueTypes({
        externalService,
        params: {},
      });
      expect(res).toEqual([
        {
          id: '10006',
          name: 'Task',
        },
        {
          id: '10007',
          name: 'Bug',
        },
      ]);
    });
  });

  describe('fieldsByIssueType', () => {
    test('it returns the fields correctly', async () => {
      const res = await api.fieldsByIssueType({
        externalService,
        params: { id: '10006' },
      });
      expect(res).toEqual({
        summary: { allowedValues: [], defaultValue: {} },
        priority: {
          allowedValues: [
            {
              name: 'Medium',
              id: '3',
            },
          ],
          defaultValue: { name: 'Medium', id: '3' },
        },
      });
    });
  });

  describe('getIssues', () => {
    test('it returns the issues correctly', async () => {
      const res = await api.issues({
        externalService,
        params: { title: 'Title test' },
      });
      expect(res).toEqual([
        {
          id: '10267',
          key: 'RJ-107',
          title: 'Test title',
        },
      ]);
    });
  });

  describe('getIssue', () => {
    test('it returns the issue correctly', async () => {
      const res = await api.issue({
        externalService,
        params: { id: 'RJ-107' },
      });
      expect(res).toEqual({
        id: '10267',
        key: 'RJ-107',
        title: 'Test title',
      });
    });
  });
});

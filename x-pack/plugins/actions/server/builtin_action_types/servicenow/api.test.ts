/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '../../../../../../src/core/server';
import { externalServiceMock, apiParams, serviceNowCommonFields, serviceNowChoices } from './mocks';
import { ExternalService } from './types';
import { api } from './api';
let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
    jest.clearAllMocks();
  });

  describe('create incident', () => {
    test('it creates an incident', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      const res = await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'INC01',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        comments: [
          {
            commentId: 'case-comment-1',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
          {
            commentId: 'case-comment-2',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
        ],
      });
    });

    test('it creates an incident without comments', async () => {
      const params = {
        ...apiParams,
        incident: { ...apiParams.incident, externalId: null },
        comments: [],
      };
      const res = await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'INC01',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      });
    });

    test('it calls createIncident correctly', async () => {
      const params = {
        incident: { ...apiParams.incident, externalId: null },
        comments: [],
      };
      await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: { username: 'elastic', password: 'elastic' },
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });

      expect(externalService.createIncident).toHaveBeenCalledWith({
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          caller_id: 'elastic',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
          opened_by: 'elastic',
        },
      });
      expect(externalService.updateIncident).not.toHaveBeenCalled();
    });

    test('it calls updateIncident correctly when creating an incident and having comments', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });
      expect(externalService.updateIncident).toHaveBeenCalledTimes(2);
      expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          comments: 'A comment',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-1',
      });

      expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          comments: 'Another comment',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-1',
      });
    });

    test('it post comments to different comment field key', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'work_notes',
      });
      expect(externalService.updateIncident).toHaveBeenCalledTimes(2);
      expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          work_notes: 'A comment',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-1',
      });

      expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          work_notes: 'Another comment',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-1',
      });
    });
  });

  describe('update incident', () => {
    test('it updates an incident', async () => {
      const res = await api.pushToService({
        externalService,
        params: apiParams,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });

      expect(res).toEqual({
        id: 'incident-2',
        title: 'INC02',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        comments: [
          {
            commentId: 'case-comment-1',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
          {
            commentId: 'case-comment-2',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
        ],
      });
    });

    test('it updates an incident without comments', async () => {
      const params = { ...apiParams, comments: [] };
      const res = await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });

      expect(res).toEqual({
        id: 'incident-2',
        title: 'INC02',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      });
    });

    test('it calls updateIncident correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });

      expect(externalService.updateIncident).toHaveBeenCalledWith({
        incidentId: 'incident-3',
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
      });
      expect(externalService.createIncident).not.toHaveBeenCalled();
    });

    test('it calls updateIncident to create a comments correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'comments',
      });
      expect(externalService.updateIncident).toHaveBeenCalledTimes(3);
      expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-3',
      });

      expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          comments: 'A comment',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-2',
      });
    });

    test('it post comments to different comment field key', async () => {
      const params = { ...apiParams };
      await api.pushToService({
        externalService,
        params,
        config: {},
        secrets: {},
        logger: mockedLogger,
        commentFieldKey: 'work_notes',
      });
      expect(externalService.updateIncident).toHaveBeenCalledTimes(3);
      expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-3',
      });

      expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          category: 'software',
          subcategory: 'os',
          work_notes: 'A comment',
          description: 'Incident description',
          short_description: 'Incident title',
          correlation_display: 'Alerting',
          correlation_id: 'ruleId',
        },
        incidentId: 'incident-2',
      });
    });
  });

  describe('getFields', () => {
    test('it returns the fields correctly', async () => {
      const res = await api.getFields({
        externalService,
        params: {},
        logger: mockedLogger,
      });
      expect(res).toEqual(serviceNowCommonFields);
    });
  });

  describe('getChoices', () => {
    test('it returns the fields correctly', async () => {
      const res = await api.getChoices({
        externalService,
        params: { fields: ['priority'] },
        logger: mockedLogger,
      });
      expect(res).toEqual(serviceNowChoices);
    });
  });

  describe('getIncident', () => {
    test('it gets the incident correctly', async () => {
      const res = await api.getIncident({
        externalService,
        params: {
          externalId: 'incident-1',
        },
        logger: mockedLogger,
      });
      expect(res).toEqual({
        description: 'description from servicenow',
        id: 'incident-1',
        pushedDate: '2020-03-10T12:24:20.000Z',
        short_description: 'title from servicenow',
        title: 'INC01',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { externalServiceMock, mapping, apiParams } from './mocks';
import { ExternalService } from './types';
import { api } from './api';
let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
    jest.clearAllMocks();
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
          secrets: {},
          logger: mockedLogger,
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
        const params = { ...apiParams, externalId: null, comments: [] };
        const res = await api.pushToService({
          externalService,
          mapping,
          params,
          secrets: {},
          logger: mockedLogger,
        });

        expect(res).toEqual({
          id: 'incident-1',
          title: 'INC01',
          pushedDate: '2020-03-10T12:24:20.000Z',
          url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        });
      });

      test('it calls createIncident correctly', async () => {
        const params = { ...apiParams, externalId: null, comments: undefined };
        await api.pushToService({
          externalService,
          mapping,
          params,
          secrets: {},
          logger: mockedLogger,
        });

        expect(externalService.createIncident).toHaveBeenCalledWith({
          incident: {
            description:
              'Incident description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
            short_description:
              'Incident title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
        expect(externalService.updateIncident).not.toHaveBeenCalled();
      });

      test('it calls updateIncident correctly', async () => {
        const params = { ...apiParams, externalId: null };
        await api.pushToService({
          externalService,
          mapping,
          params,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledTimes(2);
        expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
          incident: {
            comments: 'A comment',
            description:
              'Incident description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
            short_description:
              'Incident title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
          incidentId: 'incident-1',
        });

        expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
          incident: {
            comments: 'Another comment',
            description:
              'Incident description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
            short_description:
              'Incident title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
          incidentId: 'incident-1',
        });
      });
    });

    describe('update incident', () => {
      test('it updates an incident', async () => {
        const res = await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
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
          mapping,
          params,
          secrets: {},
          logger: mockedLogger,
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
          mapping,
          params,
          secrets: {},
          logger: mockedLogger,
        });

        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            description:
              'Incident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
            short_description:
              'Incident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
        expect(externalService.createIncident).not.toHaveBeenCalled();
      });

      test('it calls updateIncident to create a comments correctly', async () => {
        const params = { ...apiParams };
        await api.pushToService({
          externalService,
          mapping,
          params,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledTimes(3);
        expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
          incident: {
            description:
              'Incident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
            short_description:
              'Incident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
          incidentId: 'incident-3',
        });

        expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
          incident: {
            comments: 'A comment',
            description:
              'Incident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
            short_description:
              'Incident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
          incidentId: 'incident-2',
        });
      });
    });

    describe('mapping variations', () => {
      test('overwrite & append', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            short_description:
              'Incident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
            description:
              'description from servicenow \r\nIncident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('nothing & append', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            description:
              'description from servicenow \r\nIncident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('append & append', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            short_description:
              'title from servicenow \r\nIncident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
            description:
              'description from servicenow \r\nIncident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('nothing & nothing', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {},
        });
      });

      test('overwrite & nothing', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            short_description:
              'Incident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('overwrite & overwrite', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            short_description:
              'Incident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
            description:
              'Incident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('nothing & overwrite', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'nothing',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            description:
              'Incident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('append & overwrite', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            short_description:
              'title from servicenow \r\nIncident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
            description:
              'Incident description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('append & nothing', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'append',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledWith({
          incidentId: 'incident-3',
          incident: {
            short_description:
              'title from servicenow \r\nIncident title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          },
        });
      });

      test('comment nothing', async () => {
        mapping.set('title', {
          target: 'short_description',
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

        mapping.set('short_description', {
          target: 'title',
          actionType: 'overwrite',
        });

        await api.pushToService({
          externalService,
          mapping,
          params: apiParams,
          secrets: {},
          logger: mockedLogger,
        });
        expect(externalService.updateIncident).toHaveBeenCalledTimes(1);
      });
    });
  });
});

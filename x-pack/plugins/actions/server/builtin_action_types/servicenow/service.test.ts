/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { createExternalService } from './service';
import * as utils from '../lib/axios_utils';
import { ExternalService } from './types';

jest.mock('axios');
jest.mock('../lib/axios_utils', () => {
  const originalUtils = jest.requireActual('../lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = utils.request as jest.Mock;
const patchMock = utils.patch as jest.Mock;

describe('ServiceNow service', () => {
  let service: ExternalService;

  beforeAll(() => {
    service = createExternalService({
      config: { apiUrl: 'https://dev102283.service-now.com' },
      secrets: { username: 'admin', password: 'admin' },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExternalService', () => {
    test('throws without url', () => {
      expect(() =>
        createExternalService({
          config: { apiUrl: null },
          secrets: { username: 'admin', password: 'admin' },
        })
      ).toThrow();
    });

    test('throws without username', () => {
      expect(() =>
        createExternalService({
          config: { apiUrl: 'test.com' },
          secrets: { username: '', password: 'admin' },
        })
      ).toThrow();
    });

    test('throws without password', () => {
      expect(() =>
        createExternalService({
          config: { apiUrl: 'test.com' },
          secrets: { username: '', password: undefined },
        })
      ).toThrow();
    });
  });

  describe('getIncident', () => {
    test('it returns the incident correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01' } },
      }));
      const res = await service.getIncident('1');
      expect(res).toEqual({ sys_id: '1', number: 'INC01' });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01' } },
      }));

      await service.getIncident('1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://dev102283.service-now.com/api/now/v2/table/incident/1',
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      expect(service.getIncident('1')).rejects.toThrow(
        'Unable to get incident with id 1. Error: An error has occurred'
      );
    });
  });

  describe('createIncident', () => {
    test('it creates the incident correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' } },
      }));

      const res = await service.createIncident({
        incident: { short_description: 'title', description: 'desc' },
      });

      expect(res).toEqual({
        title: 'INC01',
        id: '1',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://dev102283.service-now.com/nav_to.do?uri=incident.do?sys_id=1',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' } },
      }));

      await service.createIncident({
        incident: { short_description: 'title', description: 'desc' },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://dev102283.service-now.com/api/now/v2/table/incident',
        method: 'post',
        data: { short_description: 'title', description: 'desc' },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      expect(
        service.createIncident({
          incident: { short_description: 'title', description: 'desc' },
        })
      ).rejects.toThrow(
        '[Action][ServiceNow]: Unable to create incident. Error: An error has occurred'
      );
    });
  });

  describe('updateIncident', () => {
    test('it updates the incident correctly', async () => {
      patchMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01', sys_updated_on: '2020-03-10 12:24:20' } },
      }));

      const res = await service.updateIncident({
        incidentId: '1',
        incident: { short_description: 'title', description: 'desc' },
      });

      expect(res).toEqual({
        title: 'INC01',
        id: '1',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://dev102283.service-now.com/nav_to.do?uri=incident.do?sys_id=1',
      });
    });

    test('it should call request with correct arguments', async () => {
      patchMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01', sys_updated_on: '2020-03-10 12:24:20' } },
      }));

      await service.updateIncident({
        incidentId: '1',
        incident: { short_description: 'title', description: 'desc' },
      });

      expect(patchMock).toHaveBeenCalledWith({
        axios,
        url: 'https://dev102283.service-now.com/api/now/v2/table/incident/1',
        data: { short_description: 'title', description: 'desc' },
      });
    });

    test('it should throw an error', async () => {
      patchMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      expect(
        service.updateIncident({
          incidentId: '1',
          incident: { short_description: 'title', description: 'desc' },
        })
      ).rejects.toThrow(
        '[Action][ServiceNow]: Unable to update incident with id 1. Error: An error has occurred'
      );
    });
    test('it creates the comment correctly', async () => {
      patchMock.mockImplementation(() => ({
        data: { result: { sys_id: '11', number: 'INC011', sys_updated_on: '2020-03-10 12:24:20' } },
      }));

      const res = await service.updateIncident({
        incidentId: '1',
        comment: 'comment-1',
      });

      expect(res).toEqual({
        title: 'INC011',
        id: '11',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://dev102283.service-now.com/nav_to.do?uri=incident.do?sys_id=11',
      });
    });
  });
});

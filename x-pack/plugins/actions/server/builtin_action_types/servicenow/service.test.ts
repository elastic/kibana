/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { createExternalService } from './service';
import * as utils from '../lib/axios_utils';
import { ExternalService } from './types';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { serviceNowCommonFields, serviceNowChoices } from './mocks';
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

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
const configurationUtilities = actionsConfigMock.create();
const table = 'incident';

describe('ServiceNow service', () => {
  let service: ExternalService;

  beforeEach(() => {
    service = createExternalService(
      table,
      {
        // The trailing slash at the end of the url is intended.
        // All API calls need to have the trailing slash removed.
        config: { apiUrl: 'https://dev102283.service-now.com/' },
        secrets: { username: 'admin', password: 'admin' },
      },
      logger,
      configurationUtilities
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExternalService', () => {
    test('throws without url', () => {
      expect(() =>
        createExternalService(
          table,
          {
            config: { apiUrl: null },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without username', () => {
      expect(() =>
        createExternalService(
          table,
          {
            config: { apiUrl: 'test.com' },
            secrets: { username: '', password: 'admin' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without password', () => {
      expect(() =>
        createExternalService(
          table,
          {
            config: { apiUrl: 'test.com' },
            secrets: { username: '', password: undefined },
          },
          logger,
          configurationUtilities
        )
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
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/incident/1',
      });
    });

    test('it should call request with correct arguments when table changes', async () => {
      service = createExternalService(
        'sn_si_incident',
        {
          config: { apiUrl: 'https://dev102283.service-now.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities
      );

      requestMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01' } },
      }));

      await service.getIncident('1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/sn_si_incident/1',
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      await expect(service.getIncident('1')).rejects.toThrow(
        'Unable to get incident with id 1. Error: An error has occurred'
      );
    });

    test('it should throw an error when instance is not alive', async () => {
      requestMock.mockImplementation(() => ({
        status: 200,
        data: {},
        request: { connection: { servername: 'Developer instance' } },
      }));
      await expect(service.getIncident('1')).rejects.toThrow(
        'There is an issue with your Service Now Instance. Please check Developer instance.'
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
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/incident',
        method: 'post',
        data: { short_description: 'title', description: 'desc' },
      });
    });

    test('it should call request with correct arguments when table changes', async () => {
      service = createExternalService(
        'sn_si_incident',
        {
          config: { apiUrl: 'https://dev102283.service-now.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities
      );

      requestMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' } },
      }));

      const res = await service.createIncident({
        incident: { short_description: 'title', description: 'desc' },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/sn_si_incident',
        method: 'post',
        data: { short_description: 'title', description: 'desc' },
      });

      expect(res.url).toEqual(
        'https://dev102283.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=1'
      );
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(
        service.createIncident({
          incident: { short_description: 'title', description: 'desc' },
        })
      ).rejects.toThrow(
        '[Action][ServiceNow]: Unable to create incident. Error: An error has occurred'
      );
    });

    test('it should throw an error when instance is not alive', async () => {
      requestMock.mockImplementation(() => ({
        status: 200,
        data: {},
        request: { connection: { servername: 'Developer instance' } },
      }));
      await expect(service.getIncident('1')).rejects.toThrow(
        'There is an issue with your Service Now Instance. Please check Developer instance.'
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
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/incident/1',
        data: { short_description: 'title', description: 'desc' },
      });
    });

    test('it should call request with correct arguments when table changes', async () => {
      service = createExternalService(
        'sn_si_incident',
        {
          config: { apiUrl: 'https://dev102283.service-now.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities
      );

      patchMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01', sys_updated_on: '2020-03-10 12:24:20' } },
      }));

      const res = await service.updateIncident({
        incidentId: '1',
        incident: { short_description: 'title', description: 'desc' },
      });

      expect(patchMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/sn_si_incident/1',
        data: { short_description: 'title', description: 'desc' },
      });

      expect(res.url).toEqual(
        'https://dev102283.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=1'
      );
    });

    test('it should throw an error', async () => {
      patchMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(
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

    test('it should throw an error when instance is not alive', async () => {
      requestMock.mockImplementation(() => ({
        status: 200,
        data: {},
        request: { connection: { servername: 'Developer instance' } },
      }));
      await expect(service.getIncident('1')).rejects.toThrow(
        'There is an issue with your Service Now Instance. Please check Developer instance.'
      );
    });
  });

  describe('getFields', () => {
    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: serviceNowCommonFields },
      }));
      await service.getFields();

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/sys_dictionary?sysparm_query=name=task^ORname=incident^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory',
      });
    });

    test('it returns common fields correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: serviceNowCommonFields },
      }));
      const res = await service.getFields();
      expect(res).toEqual(serviceNowCommonFields);
    });

    test('it should call request with correct arguments when table changes', async () => {
      service = createExternalService(
        'sn_si_incident',
        {
          config: { apiUrl: 'https://dev102283.service-now.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities
      );

      requestMock.mockImplementation(() => ({
        data: { result: serviceNowCommonFields },
      }));
      await service.getFields();

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/sys_dictionary?sysparm_query=name=task^ORname=sn_si_incident^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory',
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      await expect(service.getFields()).rejects.toThrow(
        '[Action][ServiceNow]: Unable to get fields. Error: An error has occurred'
      );
    });

    test('it should throw an error when instance is not alive', async () => {
      requestMock.mockImplementation(() => ({
        status: 200,
        data: {},
        request: { connection: { servername: 'Developer instance' } },
      }));
      await expect(service.getIncident('1')).rejects.toThrow(
        'There is an issue with your Service Now Instance. Please check Developer instance.'
      );
    });
  });

  describe('getChoices', () => {
    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: serviceNowChoices },
      }));
      await service.getChoices(['priority', 'category']);

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/sys_choice?sysparm_query=name=task^ORname=incident^element=priority^ORelement=category&sysparm_fields=label,value,dependent_value,element',
      });
    });

    test('it returns common fields correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: serviceNowChoices },
      }));
      const res = await service.getChoices(['priority']);
      expect(res).toEqual(serviceNowChoices);
    });

    test('it should call request with correct arguments when table changes', async () => {
      service = createExternalService(
        'sn_si_incident',
        {
          config: { apiUrl: 'https://dev102283.service-now.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities
      );

      requestMock.mockImplementation(() => ({
        data: { result: serviceNowChoices },
      }));

      await service.getChoices(['priority', 'category']);

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://dev102283.service-now.com/api/now/v2/table/sys_choice?sysparm_query=name=task^ORname=sn_si_incident^element=priority^ORelement=category&sysparm_fields=label,value,dependent_value,element',
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      await expect(service.getChoices(['priority'])).rejects.toThrow(
        '[Action][ServiceNow]: Unable to get choices. Error: An error has occurred'
      );
    });

    test('it should throw an error when instance is not alive', async () => {
      requestMock.mockImplementation(() => ({
        status: 200,
        data: {},
        request: { connection: { servername: 'Developer instance' } },
      }));
      await expect(service.getIncident('1')).rejects.toThrow(
        'There is an issue with your Service Now Instance. Please check Developer instance.'
      );
    });
  });
});

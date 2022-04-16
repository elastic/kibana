/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';

import { createExternalService } from './service';
import * as utils from '../lib/axios_utils';
import { ExternalService, ServiceNowITSMIncident } from './types';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { serviceNowCommonFields, serviceNowChoices } from './mocks';
import { snExternalServiceConfig } from './config';
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
const configurationUtilities = actionsConfigMock.create();

const getImportSetAPIResponse = (update = false) => ({
  import_set: 'ISET01',
  staging_table: 'x_elas2_inc_int_elastic_incident',
  result: [
    {
      transform_map: 'Elastic Incident',
      table: 'incident',
      display_name: 'number',
      display_value: 'INC01',
      record_link: 'https://example.com/api/now/table/incident/1',
      status: update ? 'updated' : 'inserted',
      sys_id: '1',
    },
  ],
});

const getImportSetAPIError = () => ({
  import_set: 'ISET01',
  staging_table: 'x_elas2_inc_int_elastic_incident',
  result: [
    {
      transform_map: 'Elastic Incident',
      status: 'error',
      error_message: 'An error has occurred while importing the incident',
      status_message: 'failure',
    },
  ],
});

const mockApplicationVersion = () =>
  requestMock.mockImplementationOnce(() => ({
    data: {
      result: { name: 'Elastic', scope: 'x_elas2_inc_int', version: '1.0.0' },
    },
  }));

const mockImportIncident = (update: boolean) =>
  requestMock.mockImplementationOnce(() => ({
    data: getImportSetAPIResponse(update),
  }));

const mockIncidentResponse = (update: boolean) =>
  requestMock.mockImplementation(() => ({
    data: {
      result: {
        sys_id: '1',
        number: 'INC01',
        ...(update
          ? { sys_updated_on: '2020-03-10 12:24:20' }
          : { sys_created_on: '2020-03-10 12:24:20' }),
      },
    },
  }));

const createIncident = async (service: ExternalService) => {
  // Get application version
  mockApplicationVersion();
  // Import set api response
  mockImportIncident(false);
  // Get incident response
  mockIncidentResponse(false);

  return await service.createIncident({
    incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
  });
};

const updateIncident = async (service: ExternalService) => {
  // Get application version
  mockApplicationVersion();
  // Import set api response
  mockImportIncident(true);
  // Get incident response
  mockIncidentResponse(true);

  return await service.updateIncident({
    incidentId: '1',
    incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
  });
};

const expectImportedIncident = (update: boolean) => {
  expect(requestMock).toHaveBeenNthCalledWith(1, {
    axios,
    logger,
    configurationUtilities,
    url: 'https://example.com/api/x_elas2_inc_int/elastic_api/health',
    method: 'get',
  });

  expect(requestMock).toHaveBeenNthCalledWith(2, {
    axios,
    logger,
    configurationUtilities,
    url: 'https://example.com/api/now/import/x_elas2_inc_int_elastic_incident',
    method: 'post',
    data: {
      u_short_description: 'title',
      u_description: 'desc',
      ...(update ? { elastic_incident_id: '1' } : {}),
    },
  });

  expect(requestMock).toHaveBeenNthCalledWith(3, {
    axios,
    logger,
    configurationUtilities,
    url: 'https://example.com/api/now/v2/table/incident/1',
    method: 'get',
  });
};

describe('ServiceNow service', () => {
  let service: ExternalService;

  beforeEach(() => {
    service = createExternalService(
      {
        // The trailing slash at the end of the url is intended.
        // All API calls need to have the trailing slash removed.
        config: { apiUrl: 'https://example.com/' },
        secrets: { username: 'admin', password: 'admin' },
      },
      logger,
      configurationUtilities,
      snExternalServiceConfig['.servicenow']
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExternalService', () => {
    test('throws without url', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: null },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          snExternalServiceConfig['.servicenow']
        )
      ).toThrow();
    });

    test('throws without username', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: 'test.com' },
            secrets: { username: '', password: 'admin' },
          },
          logger,
          configurationUtilities,
          snExternalServiceConfig['.servicenow']
        )
      ).toThrow();
    });

    test('throws without password', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: 'test.com' },
            secrets: { username: '', password: undefined },
          },
          logger,
          configurationUtilities,
          snExternalServiceConfig['.servicenow']
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
        url: 'https://example.com/api/now/v2/table/incident/1',
        method: 'get',
      });
    });

    test('it should call request with correct arguments when table changes', async () => {
      service = createExternalService(
        {
          config: { apiUrl: 'https://example.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities,
        { ...snExternalServiceConfig['.servicenow'], table: 'sn_si_incident' }
      );

      requestMock.mockImplementation(() => ({
        data: { result: { sys_id: '1', number: 'INC01' } },
      }));

      await service.getIncident('1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://example.com/api/now/v2/table/sn_si_incident/1',
        method: 'get',
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
    // new connectors
    describe('import set table', () => {
      test('it creates the incident correctly', async () => {
        const res = await createIncident(service);
        expect(res).toEqual({
          title: 'INC01',
          id: '1',
          pushedDate: '2020-03-10T12:24:20.000Z',
          url: 'https://example.com/nav_to.do?uri=incident.do?sys_id=1',
        });
      });

      test('it should call request with correct arguments', async () => {
        await createIncident(service);
        expect(requestMock).toHaveBeenCalledTimes(3);
        expectImportedIncident(false);
      });

      test('it should call request with correct arguments when table changes', async () => {
        service = createExternalService(
          {
            config: { apiUrl: 'https://example.com/' },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          snExternalServiceConfig['.servicenow-sir']
        );

        const res = await createIncident(service);

        expect(requestMock).toHaveBeenNthCalledWith(1, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/x_elas2_sir_int/elastic_api/health',
          method: 'get',
        });

        expect(requestMock).toHaveBeenNthCalledWith(2, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/import/x_elas2_sir_int_elastic_si_incident',
          method: 'post',
          data: { u_short_description: 'title', u_description: 'desc' },
        });

        expect(requestMock).toHaveBeenNthCalledWith(3, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/v2/table/sn_si_incident/1',
          method: 'get',
        });

        expect(res.url).toEqual('https://example.com/nav_to.do?uri=sn_si_incident.do?sys_id=1');
      });

      test('it should throw an error when the application is not installed', async () => {
        requestMock.mockImplementation(() => {
          throw new Error('An error has occurred');
        });

        await expect(
          service.createIncident({
            incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
          })
        ).rejects.toThrow(
          '[Action][ServiceNow]: Unable to create incident. Error: [Action][ServiceNow]: Unable to get application version. Error: An error has occurred Reason: unknown: errorResponse was null Reason: unknown: errorResponse was null'
        );
      });

      test('it should throw an error when instance is not alive', async () => {
        requestMock.mockImplementation(() => ({
          status: 200,
          data: {},
          request: { connection: { servername: 'Developer instance' } },
        }));
        await expect(
          service.createIncident({
            incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
          })
        ).rejects.toThrow(
          'There is an issue with your Service Now Instance. Please check Developer instance.'
        );
      });

      test('it should throw an error when there is an import set api error', async () => {
        requestMock.mockImplementation(() => ({ data: getImportSetAPIError() }));
        await expect(
          service.createIncident({
            incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
          })
        ).rejects.toThrow(
          '[Action][ServiceNow]: Unable to create incident. Error: An error has occurred while importing the incident Reason: unknown'
        );
      });
    });

    // old connectors
    describe('table API', () => {
      beforeEach(() => {
        service = createExternalService(
          {
            config: { apiUrl: 'https://example.com/' },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          { ...snExternalServiceConfig['.servicenow'], useImportAPI: false }
        );
      });

      test('it creates the incident correctly', async () => {
        mockIncidentResponse(false);
        const res = await service.createIncident({
          incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
        });

        expect(res).toEqual({
          title: 'INC01',
          id: '1',
          pushedDate: '2020-03-10T12:24:20.000Z',
          url: 'https://example.com/nav_to.do?uri=incident.do?sys_id=1',
        });

        expect(requestMock).toHaveBeenCalledTimes(2);
        expect(requestMock).toHaveBeenNthCalledWith(1, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/v2/table/incident',
          method: 'post',
          data: { short_description: 'title', description: 'desc' },
        });
      });

      test('it should call request with correct arguments when table changes', async () => {
        service = createExternalService(
          {
            config: { apiUrl: 'https://example.com/' },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          { ...snExternalServiceConfig['.servicenow-sir'], useImportAPI: false }
        );

        mockIncidentResponse(false);

        const res = await service.createIncident({
          incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
        });

        expect(requestMock).toHaveBeenNthCalledWith(1, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/v2/table/sn_si_incident',
          method: 'post',
          data: { short_description: 'title', description: 'desc' },
        });

        expect(res.url).toEqual('https://example.com/nav_to.do?uri=sn_si_incident.do?sys_id=1');
      });
    });
  });

  describe('updateIncident', () => {
    // new connectors
    describe('import set table', () => {
      test('it updates the incident correctly', async () => {
        const res = await updateIncident(service);

        expect(res).toEqual({
          title: 'INC01',
          id: '1',
          pushedDate: '2020-03-10T12:24:20.000Z',
          url: 'https://example.com/nav_to.do?uri=incident.do?sys_id=1',
        });
      });

      test('it should call request with correct arguments', async () => {
        await updateIncident(service);
        expectImportedIncident(true);
      });

      test('it should call request with correct arguments when table changes', async () => {
        service = createExternalService(
          {
            config: { apiUrl: 'https://example.com/' },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          snExternalServiceConfig['.servicenow-sir']
        );

        const res = await updateIncident(service);
        expect(requestMock).toHaveBeenNthCalledWith(1, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/x_elas2_sir_int/elastic_api/health',
          method: 'get',
        });

        expect(requestMock).toHaveBeenNthCalledWith(2, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/import/x_elas2_sir_int_elastic_si_incident',
          method: 'post',
          data: { u_short_description: 'title', u_description: 'desc', elastic_incident_id: '1' },
        });

        expect(requestMock).toHaveBeenNthCalledWith(3, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/v2/table/sn_si_incident/1',
          method: 'get',
        });

        expect(res.url).toEqual('https://example.com/nav_to.do?uri=sn_si_incident.do?sys_id=1');
      });

      test('it should throw an error when the application is not installed', async () => {
        requestMock.mockImplementation(() => {
          throw new Error('An error has occurred');
        });

        await expect(
          service.updateIncident({
            incidentId: '1',
            incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
          })
        ).rejects.toThrow(
          '[Action][ServiceNow]: Unable to update incident with id 1. Error: [Action][ServiceNow]: Unable to get application version. Error: An error has occurred Reason: unknown: errorResponse was null Reason: unknown: errorResponse was null'
        );
      });

      test('it should throw an error when instance is not alive', async () => {
        requestMock.mockImplementation(() => ({
          status: 200,
          data: {},
          request: { connection: { servername: 'Developer instance' } },
        }));
        await expect(
          service.updateIncident({
            incidentId: '1',
            incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
          })
        ).rejects.toThrow(
          'There is an issue with your Service Now Instance. Please check Developer instance.'
        );
      });

      test('it should throw an error when there is an import set api error', async () => {
        requestMock.mockImplementation(() => ({ data: getImportSetAPIError() }));
        await expect(
          service.updateIncident({
            incidentId: '1',
            incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
          })
        ).rejects.toThrow(
          '[Action][ServiceNow]: Unable to update incident with id 1. Error: An error has occurred while importing the incident Reason: unknown'
        );
      });
    });

    // old connectors
    describe('table API', () => {
      beforeEach(() => {
        service = createExternalService(
          {
            config: { apiUrl: 'https://example.com/' },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          { ...snExternalServiceConfig['.servicenow'], useImportAPI: false }
        );
      });

      test('it updates the incident correctly', async () => {
        mockIncidentResponse(true);
        const res = await service.updateIncident({
          incidentId: '1',
          incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
        });

        expect(res).toEqual({
          title: 'INC01',
          id: '1',
          pushedDate: '2020-03-10T12:24:20.000Z',
          url: 'https://example.com/nav_to.do?uri=incident.do?sys_id=1',
        });

        expect(requestMock).toHaveBeenCalledTimes(2);
        expect(requestMock).toHaveBeenNthCalledWith(1, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/v2/table/incident/1',
          method: 'patch',
          data: { short_description: 'title', description: 'desc' },
        });
      });

      test('it should call request with correct arguments when table changes', async () => {
        service = createExternalService(
          {
            config: { apiUrl: 'https://example.com/' },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          { ...snExternalServiceConfig['.servicenow-sir'], useImportAPI: false }
        );

        mockIncidentResponse(false);

        const res = await service.updateIncident({
          incidentId: '1',
          incident: { short_description: 'title', description: 'desc' } as ServiceNowITSMIncident,
        });

        expect(requestMock).toHaveBeenNthCalledWith(1, {
          axios,
          logger,
          configurationUtilities,
          url: 'https://example.com/api/now/v2/table/sn_si_incident/1',
          method: 'patch',
          data: { short_description: 'title', description: 'desc' },
        });

        expect(res.url).toEqual('https://example.com/nav_to.do?uri=sn_si_incident.do?sys_id=1');
      });
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
        url: 'https://example.com/api/now/table/sys_dictionary?sysparm_query=name=task^ORname=incident^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory',
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
        {
          config: { apiUrl: 'https://example.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities,
        { ...snExternalServiceConfig['.servicenow'], table: 'sn_si_incident' }
      );

      requestMock.mockImplementation(() => ({
        data: { result: serviceNowCommonFields },
      }));
      await service.getFields();

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://example.com/api/now/table/sys_dictionary?sysparm_query=name=task^ORname=sn_si_incident^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory',
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
        url: 'https://example.com/api/now/table/sys_choice?sysparm_query=name=task^ORname=incident^element=priority^ORelement=category^language=en&sysparm_fields=label,value,dependent_value,element',
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
        {
          config: { apiUrl: 'https://example.com/' },
          secrets: { username: 'admin', password: 'admin' },
        },
        logger,
        configurationUtilities,
        { ...snExternalServiceConfig['.servicenow'], table: 'sn_si_incident' }
      );

      requestMock.mockImplementation(() => ({
        data: { result: serviceNowChoices },
      }));

      await service.getChoices(['priority', 'category']);

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://example.com/api/now/table/sys_choice?sysparm_query=name=task^ORname=sn_si_incident^element=priority^ORelement=category^language=en&sysparm_fields=label,value,dependent_value,element',
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

  describe('getUrl', () => {
    test('it returns the instance url', async () => {
      expect(service.getUrl()).toBe('https://example.com');
    });
  });

  describe('checkInstance', () => {
    test('it throws an error if there is no result on data', () => {
      const res = { status: 200, data: {} } as AxiosResponse;
      expect(() => service.checkInstance(res)).toThrow();
    });

    test('it does NOT throws an error if the status > 400', () => {
      const res = { status: 500, data: {} } as AxiosResponse;
      expect(() => service.checkInstance(res)).not.toThrow();
    });

    test('it shows the servername', () => {
      const res = {
        status: 200,
        data: {},
        request: { connection: { servername: 'https://example.com' } },
      } as AxiosResponse;
      expect(() => service.checkInstance(res)).toThrow(
        'There is an issue with your Service Now Instance. Please check https://example.com.'
      );
    });

    describe('getApplicationInformation', () => {
      test('it returns the application information', async () => {
        mockApplicationVersion();
        const res = await service.getApplicationInformation();
        expect(res).toEqual({
          name: 'Elastic',
          scope: 'x_elas2_inc_int',
          version: '1.0.0',
        });
      });

      test('it should throw an error', async () => {
        requestMock.mockImplementation(() => {
          throw new Error('An error has occurred');
        });
        await expect(service.getApplicationInformation()).rejects.toThrow(
          '[Action][ServiceNow]: Unable to get application version. Error: An error has occurred Reason: unknown'
        );
      });
    });

    describe('checkIfApplicationIsInstalled', () => {
      test('it logs the application information', async () => {
        mockApplicationVersion();
        await service.checkIfApplicationIsInstalled();
        expect(logger.debug).toHaveBeenCalledWith(
          'Create incident: Application scope: x_elas2_inc_int: Application version1.0.0'
        );
      });

      test('it does not log if useOldApi = true', async () => {
        service = createExternalService(
          {
            config: { apiUrl: 'https://example.com/' },
            secrets: { username: 'admin', password: 'admin' },
          },
          logger,
          configurationUtilities,
          { ...snExternalServiceConfig['.servicenow'], useImportAPI: false }
        );
        await service.checkIfApplicationIsInstalled();
        expect(requestMock).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalled();
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { OverviewHostData, OverviewNetworkData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchOverviewAdapter } from './elasticsearch_adapter';
import {
  mockOptionsHost,
  mockOptionsNetwork,
  mockRequestHost,
  mockRequestNetwork,
  mockResponseHost,
  mockResponseNetwork,
  mockResultHost,
  mockResultNetwork,
} from './mock';

describe('Siem Overview elasticsearch_adapter', () => {
  describe('Network Stats', () => {
    describe('Happy Path - get Data', () => {
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockResponseNetwork);
      const mockFramework: FrameworkAdapter = {
        version: 'mock',
        callWithRequest: mockCallWithRequest,
        exposeStaticDir: jest.fn(),
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
        getSavedObjectsService: jest.fn(),
      };
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      test('getOverviewNetwork', async () => {
        const EsOverviewNetwork = new ElasticsearchOverviewAdapter(mockFramework);
        const data: OverviewNetworkData = await EsOverviewNetwork.getOverviewNetwork(
          mockRequestNetwork as FrameworkRequest,
          mockOptionsNetwork
        );
        expect(data).toEqual(mockResultNetwork);
      });
    });

    describe('Unhappy Path - No data', () => {
      const mockNoDataResponse = cloneDeep(mockResponseNetwork);
      mockNoDataResponse.aggregations.unique_flow_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_dns_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_suricata_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_zeek_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_socket_count.doc_count = 0;
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockNoDataResponse);
      const mockFramework: FrameworkAdapter = {
        version: 'mock',
        callWithRequest: mockCallWithRequest,
        exposeStaticDir: jest.fn(),
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
        getSavedObjectsService: jest.fn(),
      };
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      test('getOverviewNetwork', async () => {
        const EsOverviewNetwork = new ElasticsearchOverviewAdapter(mockFramework);
        const data: OverviewNetworkData = await EsOverviewNetwork.getOverviewNetwork(
          mockRequestNetwork as FrameworkRequest,
          mockOptionsNetwork
        );
        expect(data).toEqual({
          packetbeatFlow: 0,
          packetbeatDNS: 0,
          filebeatSuricata: 0,
          filebeatZeek: 0,
          auditbeatSocket: 0,
        });
      });
    });
  });
  describe('Host Stats', () => {
    describe('Happy Path - get Data', () => {
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockResponseHost);
      const mockFramework: FrameworkAdapter = {
        version: 'mock',
        callWithRequest: mockCallWithRequest,
        exposeStaticDir: jest.fn(),
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
        getSavedObjectsService: jest.fn(),
      };
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      test('getOverviewHost', async () => {
        const EsOverviewHost = new ElasticsearchOverviewAdapter(mockFramework);
        const data: OverviewHostData = await EsOverviewHost.getOverviewHost(
          mockRequestHost as FrameworkRequest,
          mockOptionsHost
        );
        expect(data).toEqual(mockResultHost);
      });
    });

    describe('Unhappy Path - No data', () => {
      const mockNoDataResponse = cloneDeep(mockResponseHost);
      mockNoDataResponse.aggregations.auditd_count.doc_count = 0;
      mockNoDataResponse.aggregations.fim_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.login_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.package_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.process_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.user_count.doc_count = 0;
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockNoDataResponse);
      const mockFramework: FrameworkAdapter = {
        version: 'mock',
        callWithRequest: mockCallWithRequest,
        exposeStaticDir: jest.fn(),
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
        getSavedObjectsService: jest.fn(),
      };
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      test('getOverviewHost', async () => {
        const EsOverviewHost = new ElasticsearchOverviewAdapter(mockFramework);
        const data: OverviewHostData = await EsOverviewHost.getOverviewHost(
          mockRequestHost as FrameworkRequest,
          mockOptionsHost
        );
        expect(data).toEqual({
          auditbeatAuditd: 0,
          auditbeatFIM: 0,
          auditbeatLogin: 0,
          auditbeatPackage: 0,
          auditbeatProcess: 0,
          auditbeatUser: 0,
        });
      });
    });
  });
});

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
  mockBuildOverviewHostQuery,
  mockBuildOverviewNetworkQuery,
} from './mock';

jest.mock('./query.dsl', () => {
  return {
    buildOverviewHostQuery: jest.fn(() => mockBuildOverviewHostQuery),
    buildOverviewNetworkQuery: jest.fn(() => mockBuildOverviewNetworkQuery),
  };
});

describe('Siem Overview elasticsearch_adapter', () => {
  describe('Network Stats', () => {
    describe('Happy Path - get Data', () => {
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockResponseNetwork);
      const mockFramework: FrameworkAdapter = {
        callWithRequest: mockCallWithRequest,
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
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
      mockNoDataResponse.aggregations.unique_zeek_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_packetbeat_count.unique_tls_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_filebeat_count.unique_cisco_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_filebeat_count.unique_netflow_count.doc_count = 0;
      mockNoDataResponse.aggregations.unique_filebeat_count.unique_panw_count.doc_count = 0;
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockNoDataResponse);
      const mockFramework: FrameworkAdapter = {
        callWithRequest: mockCallWithRequest,
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
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
          inspect: {
            dsl: [JSON.stringify(mockBuildOverviewNetworkQuery, null, 2)],
            response: [JSON.stringify(mockNoDataResponse, null, 2)],
          },
          auditbeatSocket: 0,
          filebeatCisco: 0,
          filebeatNetflow: 0,
          filebeatPanw: 0,
          filebeatSuricata: 0,
          filebeatZeek: 0,
          packetbeatDNS: 0,
          packetbeatFlow: 0,
          packetbeatTLS: 0,
        });
      });
    });
  });
  describe('Host Stats', () => {
    describe('Happy Path - get Data', () => {
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockResponseHost);
      const mockFramework: FrameworkAdapter = {
        callWithRequest: mockCallWithRequest,
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
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
      mockNoDataResponse.aggregations.endgame_module.dns_event_count.doc_count = 0;
      mockNoDataResponse.aggregations.endgame_module.file_event_count.doc_count = 0;
      mockNoDataResponse.aggregations.endgame_module.image_load_event_count.doc_count = 0;
      mockNoDataResponse.aggregations.endgame_module.network_event_count.doc_count = 0;
      mockNoDataResponse.aggregations.endgame_module.process_event_count.doc_count = 0;
      mockNoDataResponse.aggregations.endgame_module.registry_event.doc_count = 0;
      mockNoDataResponse.aggregations.endgame_module.security_event_count.doc_count = 0;
      mockNoDataResponse.aggregations.fim_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.login_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.package_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.process_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.user_count.doc_count = 0;
      mockNoDataResponse.aggregations.system_module.filebeat_count.doc_count = 0;
      mockNoDataResponse.aggregations.winlog_module.security_event_count.doc_count = 0;
      mockNoDataResponse.aggregations.winlog_module.mwsysmon_operational_event_count.doc_count = 0;
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockResolvedValue(mockNoDataResponse);
      const mockFramework: FrameworkAdapter = {
        callWithRequest: mockCallWithRequest,
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
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
          inspect: {
            dsl: [JSON.stringify(mockBuildOverviewHostQuery, null, 2)],
            response: [JSON.stringify(mockNoDataResponse, null, 2)],
          },
          auditbeatAuditd: 0,
          auditbeatFIM: 0,
          auditbeatLogin: 0,
          auditbeatPackage: 0,
          auditbeatProcess: 0,
          auditbeatUser: 0,
          endgameDns: 0,
          endgameFile: 0,
          endgameImageLoad: 0,
          endgameNetwork: 0,
          endgameProcess: 0,
          endgameRegistry: 0,
          endgameSecurity: 0,
          filebeatSystemModule: 0,
          winlogbeatSecurity: 0,
          winlogbeatMWSysmonOperational: 0,
        });
      });
    });
  });
});

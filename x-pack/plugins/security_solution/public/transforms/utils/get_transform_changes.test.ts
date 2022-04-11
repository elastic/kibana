/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformChanges } from './get_transform_changes';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';
import {
  HostsKpiQueries,
  HostsQueries,
  MatrixHistogramQuery,
  MatrixHistogramQueryEntities,
  MatrixHistogramType,
  NetworkKpiQueries,
  NetworkQueries,
  UsersQueries,
} from '../../../common/search_strategy';

/** Get the return type of createIndicesFromPrefix for TypeScript checks against expected */
type ReturnTypeGetTransformChanges = ReturnType<typeof getTransformChanges>;

describe('get_transform_changes', () => {
  describe('kpi transforms', () => {
    test('it gets a transform change for kpiHosts', () => {
      expect(
        getTransformChanges({
          factoryQueryType: HostsKpiQueries.kpiHosts,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: HostsKpiQueries.kpiHostsEntities,
        indices: ['.estc_all_host_ent*'],
      });
    });

    test('it gets a transform change for kpiAuthentications', () => {
      expect(
        getTransformChanges({
          factoryQueryType: HostsKpiQueries.kpiAuthentications,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: HostsKpiQueries.kpiAuthenticationsEntities,
        indices: ['.estc_all_user_ent*'],
      });
    });

    test('it gets a transform change for kpiUniqueIps', () => {
      expect(
        getTransformChanges({
          factoryQueryType: HostsKpiQueries.kpiUniqueIps,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: HostsKpiQueries.kpiUniqueIpsEntities,
        indices: ['.estc_all_src_ip_ent*', '.estc_all_dest_ip_ent*'],
      });
    });
  });

  describe('host transforms', () => {
    test('it gets a transform change for hosts', () => {
      expect(
        getTransformChanges({
          factoryQueryType: HostsQueries.hosts,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: HostsQueries.hostsEntities,
        indices: ['.estc_all_host_ent*'],
      });
    });

    test('it gets a transform change for authentications', () => {
      expect(
        getTransformChanges({
          factoryQueryType: UsersQueries.authentications,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: UsersQueries.authenticationsEntities,
        indices: ['.estc_all_user_ent*'],
      });
    });
  });

  describe('network transforms', () => {
    test('it gets a transform change for topCountries', () => {
      expect(
        getTransformChanges({
          factoryQueryType: NetworkQueries.topCountries,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: NetworkQueries.topCountriesEntities,
        indices: ['.estc_all_src_iso_ent*', '.estc_all_dest_iso_ent*'],
      });
    });

    test('it gets a transform change for topNFlow', () => {
      expect(
        getTransformChanges({
          factoryQueryType: NetworkQueries.topNFlow,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: NetworkQueries.topNFlowEntities,
        indices: ['.estc_all_src_ip_ent*', '.estc_all_dest_ip_ent*'],
      });
    });

    test('it gets a transform change for dns', () => {
      expect(
        getTransformChanges({
          factoryQueryType: NetworkKpiQueries.dns,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: NetworkKpiQueries.dnsEntities,
        indices: ['.estc_all_ip_met*'],
      });
    });

    test('it gets a transform change for networkEvents', () => {
      expect(
        getTransformChanges({
          factoryQueryType: NetworkKpiQueries.networkEvents,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: NetworkKpiQueries.networkEventsEntities,
        indices: ['.estc_all_ip_met*'],
      });
    });

    test('it gets a transform change for tlsHandshakes', () => {
      expect(
        getTransformChanges({
          factoryQueryType: NetworkKpiQueries.tlsHandshakes,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        factoryQueryType: NetworkKpiQueries.tlsHandshakesEntities,
        indices: ['.estc_all_ip_met*'],
      });
    });
  });

  describe('matrix transforms', () => {
    test('it gets a transform change for authentications', () => {
      expect(
        getTransformChanges({
          factoryQueryType: MatrixHistogramQuery,
          histogramType: MatrixHistogramType.authentications,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>({
        histogramType: MatrixHistogramType.authenticationsEntities,
        factoryQueryType: MatrixHistogramQueryEntities,
        indices: ['.estc_all_user_met*'],
      });
    });
  });

  describe('unsupported/undefined transforms', () => {
    test('it returned unsupported/undefined for firstOrLastSeen since there are not transforms for it', () => {
      expect(
        getTransformChanges({
          factoryQueryType: HostsQueries.firstOrLastSeen,
          settings: getTransformConfigSchemaMock().settings[0],
        })
      ).toEqual<ReturnTypeGetTransformChanges>(undefined);
    });
  });
});

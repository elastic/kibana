/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformChangesForNetwork } from './get_transform_changes_for_network';
import { NetworkKpiQueries, NetworkQueries } from '../../../common/search_strategy';
import { HostsQueries } from '../../../common/search_strategy/security_solution/hosts';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';

/** Get the return type of getTransformChangesForNetwork for TypeScript checks against expected */
type ReturnTypeGetTransformChangesForNetwork = ReturnType<typeof getTransformChangesForNetwork>;

describe('get_transform_changes_for_network', () => {
  test('it gets a transform change for topCountries', () => {
    expect(
      getTransformChangesForNetwork({
        factoryQueryType: NetworkQueries.topCountries,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForNetwork>({
      factoryQueryType: NetworkQueries.topCountriesEntities,
      indices: ['.estc_all_src_iso_ent*', '.estc_all_dest_iso_ent*'],
    });
  });

  test('it gets a transform change for topNFlow', () => {
    expect(
      getTransformChangesForNetwork({
        factoryQueryType: NetworkQueries.topNFlow,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForNetwork>({
      factoryQueryType: NetworkQueries.topNFlowEntities,
      indices: ['.estc_all_src_ip_ent*', '.estc_all_dest_ip_ent*'],
    });
  });

  test('it gets a transform change for dns', () => {
    expect(
      getTransformChangesForNetwork({
        factoryQueryType: NetworkKpiQueries.dns,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForNetwork>({
      factoryQueryType: NetworkKpiQueries.dnsEntities,
      indices: ['.estc_all_ip_met*'],
    });
  });

  test('it gets a transform change for networkEvents', () => {
    expect(
      getTransformChangesForNetwork({
        factoryQueryType: NetworkKpiQueries.networkEvents,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForNetwork>({
      factoryQueryType: NetworkKpiQueries.networkEventsEntities,
      indices: ['.estc_all_ip_met*'],
    });
  });

  test('it gets a transform change for tlsHandshakes', () => {
    expect(
      getTransformChangesForNetwork({
        factoryQueryType: NetworkKpiQueries.tlsHandshakes,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForNetwork>({
      factoryQueryType: NetworkKpiQueries.tlsHandshakesEntities,
      indices: ['.estc_all_ip_met*'],
    });
  });

  test('it gets a transform change for uniquePrivateIps', () => {
    expect(
      getTransformChangesForNetwork({
        factoryQueryType: NetworkKpiQueries.uniquePrivateIps,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForNetwork>({
      factoryQueryType: NetworkKpiQueries.uniquePrivateIpsEntities,
      indices: ['.estc_all_src_ip_ent*', '.estc_all_dest_ip_ent*'],
    });
  });

  test('it returns an "undefined" for another value', () => {
    expect(
      getTransformChangesForNetwork({
        factoryQueryType: HostsQueries.firstOrLastSeen,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForNetwork>(undefined);
  });
});

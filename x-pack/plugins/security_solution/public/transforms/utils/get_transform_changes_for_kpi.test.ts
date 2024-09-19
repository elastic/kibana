/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformChangesForKpi } from './get_transform_changes_for_kpi';
import { HostsKpiQueries } from '../../../common/search_strategy';
import { HostsQueries } from '../../../common/search_strategy/security_solution/hosts';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';

/** Get the return type of getTransformChangesForKpi for TypeScript checks against expected */
type ReturnTypeGetTransformChangesForKpi = ReturnType<typeof getTransformChangesForKpi>;

describe('get_transform_changes_for_kpi', () => {
  test('it gets a transform change for kpiHosts', () => {
    expect(
      getTransformChangesForKpi({
        factoryQueryType: HostsKpiQueries.kpiHosts,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForKpi>({
      factoryQueryType: HostsKpiQueries.kpiHostsEntities,
      indices: ['.estc_all_host_ent*'],
    });
  });

  test('it gets a transform change for kpiAuthentications', () => {
    expect(
      getTransformChangesForKpi({
        factoryQueryType: HostsKpiQueries.kpiAuthentications,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForKpi>({
      factoryQueryType: HostsKpiQueries.kpiAuthenticationsEntities,
      indices: ['.estc_all_user_ent*'],
    });
  });

  test('it gets a transform change for kpiUniqueIps', () => {
    expect(
      getTransformChangesForKpi({
        factoryQueryType: HostsKpiQueries.kpiUniqueIps,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForKpi>({
      factoryQueryType: HostsKpiQueries.kpiUniqueIpsEntities,
      indices: ['.estc_all_src_ip_ent*', '.estc_all_dest_ip_ent*'],
    });
  });

  test('it returns an "undefined" for another value', () => {
    expect(
      getTransformChangesForKpi({
        factoryQueryType: HostsQueries.firstOrLastSeen,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForKpi>(undefined);
  });
});

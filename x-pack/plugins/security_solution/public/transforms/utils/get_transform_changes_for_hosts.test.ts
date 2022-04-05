/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformChangesForHosts } from './get_transform_changes_for_hosts';
import { HostsQueries } from '../../../common/search_strategy/security_solution/hosts';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';

/** Get the return type of getTransformChangesForHosts for TypeScript checks against expected */
type ReturnTypeGetTransformChangesForHosts = ReturnType<typeof getTransformChangesForHosts>;

describe('get_transform_changes_for_host', () => {
  test('it gets a transform change for hosts', () => {
    expect(
      getTransformChangesForHosts({
        factoryQueryType: HostsQueries.hosts,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForHosts>({
      factoryQueryType: HostsQueries.hostsEntities,
      indices: ['.estc_all_host_ent*'],
    });
  });

  test('it returns an "undefined" for another value', () => {
    expect(
      getTransformChangesForHosts({
        factoryQueryType: HostsQueries.firstOrLastSeen,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForHosts>(undefined);
  });
});

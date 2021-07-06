/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformChangesForHosts } from './get_transform_changes_for_hosts';
import { TransformConfigSchema } from '../../../common/transforms/types';
import { HostsQueries } from '../../../common/search_strategy/security_solution/hosts';

/** Get the return type of getTransformChangesForHosts for TypeScript checks against expected */
type ReturnTypeGetTransformChangesForHosts = ReturnType<typeof getTransformChangesForHosts>;

describe('get_transform_changes_for_host', () => {
  const mockTransformSetting: TransformConfigSchema['settings'][0] = {
    prefix: 'all',
    indices: ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
    data_sources: [
      ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
      ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
      ['auditbeat-*'],
    ],
  };

  test('it gets a transform change for hosts', () => {
    expect(
      getTransformChangesForHosts({
        factoryQueryType: HostsQueries.hosts,
        settings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeGetTransformChangesForHosts>({
      factoryQueryType: HostsQueries.hostsEntities,
      indices: ['.estc_all_host_ent*'],
    });
  });

  test('it gets a transform change for authentications', () => {
    expect(
      getTransformChangesForHosts({
        factoryQueryType: HostsQueries.authentications,
        settings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeGetTransformChangesForHosts>({
      factoryQueryType: HostsQueries.authenticationsEntities,
      indices: ['.estc_all_user_ent*'],
    });
  });

  test('it returns an "undefined" for another value', () => {
    expect(
      getTransformChangesForHosts({
        factoryQueryType: HostsQueries.firstOrLastSeen,
        settings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeGetTransformChangesForHosts>(undefined);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTransformChangesIfTheyExist } from './get_transform_changes_if_they_exist';
import { HostsKpiQueries, HostsQueries } from '../../../common/search_strategy';
import moment from 'moment';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';

/** Get the return type of createIndicesFromPrefix for TypeScript checks against expected */
type ReturnTypeGetTransformChangesIfTheyExist = ReturnType<typeof getTransformChangesIfTheyExist>;

describe('get_transform_changes_if_they_exist', () => {
  beforeEach(() => {
    // Adds extra switch to suppress deprecation warnings that moment does not expose in TypeScript
    (
      moment as typeof moment & {
        suppressDeprecationWarnings: boolean;
      }
    ).suppressDeprecationWarnings = true;
  });

  afterEach(() => {
    // Adds extra switch to suppress deprecation warnings that moment does not expose in TypeScript
    (
      moment as typeof moment & {
        suppressDeprecationWarnings: boolean;
      }
    ).suppressDeprecationWarnings = false;
  });

  describe('transformSettings enabled conditional logic', () => {
    test('returns transformed settings if our settings is enabled', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: { ...getTransformConfigSchemaMock(), enabled: true }, // sets enabled to true
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['.estc_all_host_ent*'],
        factoryQueryType: HostsQueries.hostsEntities,
      });
    });

    test('returns regular settings if our settings is disabled', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: { ...getTransformConfigSchemaMock(), enabled: false }, // sets enabled to false
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['auditbeat-*'],
        factoryQueryType: HostsQueries.hosts,
      });
    });
  });

  describe('filter query compatibility conditional logic', () => {
    test('returns regular settings if filter is set to something other than match_all', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: {
            bool: {
              must: [],
              filter: [{ match_none: {} }], // match_none shouldn't return transform
              should: [],
              must_not: [],
            },
          },
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['auditbeat-*'],
        factoryQueryType: HostsQueries.hosts,
      });
    });

    test('returns transformed settings if filter is set to something such as match_all', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: {
            bool: {
              must: [],
              filter: [{ match_all: {} }], // match_all should return transform
              should: [],
              must_not: [],
            },
          },
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['.estc_all_host_ent*'],
        factoryQueryType: HostsQueries.hostsEntities,
      });
    });

    test('returns transformed settings if filter is set to undefined', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined, // undefined should return transform
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['.estc_all_host_ent*'],
        factoryQueryType: HostsQueries.hostsEntities,
      });
    });
  });

  describe('timerange adjustments conditional logic', () => {
    test('returns regular settings if timerange is less than an hour', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z', // Less than hour
            from: '2021-07-06T23:39:38.643Z', // Less than hour
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['auditbeat-*'],
        factoryQueryType: HostsQueries.hosts,
      });
    });

    test('returns regular settings if timerange is invalid', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: 'now-invalid', // invalid to
            from: 'now-invalid2', // invalid from
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['auditbeat-*'],
        factoryQueryType: HostsQueries.hosts,
      });
    });

    test('returns transformed settings if timerange is greater than an hour', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z', // Greater than an hour
            from: '2021-07-06T20:49:38.643Z', // Greater than an hour
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['.estc_all_host_ent*'],
        factoryQueryType: HostsQueries.hostsEntities,
      });
    });
  });

  describe('settings match conditional logic', () => {
    test('it returns regular settings if settings do not match', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: ['should-not-match-*'], // index doesn't match anything
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['should-not-match-*'],
        factoryQueryType: HostsQueries.hosts,
      });
    });

    test('it returns transformed settings if settings do match', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hosts,
          indices: [
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
            '-subtract-something',
          ],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['.estc_all_host_ent*'],
        factoryQueryType: HostsQueries.hostsEntities,
      });
    });
  });

  describe('transform changes conditional logic', () => {
    test('it returns regular settings if it does not match a transform factory type', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.firstOrLastSeen, // query type not used for any transforms yet
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['auditbeat-*'],
        factoryQueryType: HostsQueries.firstOrLastSeen,
      });
    });

    test('it returns transformed settings if it does match a transform factory type', () => {
      expect(
        getTransformChangesIfTheyExist({
          factoryQueryType: HostsKpiQueries.kpiHosts, // valid kpiHosts for a transform
          indices: ['auditbeat-*'],
          transformSettings: getTransformConfigSchemaMock(),
          filterQuery: undefined,
          histogramType: undefined,
          timerange: {
            to: '2021-07-06T23:49:38.643Z',
            from: '2021-07-06T20:49:38.643Z',
            interval: '5m',
          },
        })
      ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
        indices: ['.estc_all_host_ent*'],
        factoryQueryType: HostsKpiQueries.kpiHostsEntities,
      });
    });
  });
});

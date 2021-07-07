/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TransformConfigSchema } from '../../../common/transforms/types';
import { getTransformChangesIfTheyExist } from './get_transform_changes_if_they_exist';
import { HostsQueries } from '../../../common/search_strategy';

/** Get the return type of createIndicesFromPrefix for TypeScript checks against expected */
type ReturnTypeGetTransformChangesIfTheyExist = ReturnType<typeof getTransformChangesIfTheyExist>;

describe('get_transform_changes_if_they_exist', () => {
  let mockTransformSetting: TransformConfigSchema = {
    enabled: true,
    auto_start: true,
    auto_create: true,
    query: {
      range: {
        '@timestamp': {
          gte: 'now-1d/d',
          format: 'strict_date_optional_time',
        },
      },
    },
    retention_policy: {
      time: {
        field: '@timestamp',
        max_age: '1w',
      },
    },
    max_page_search_size: 5000,
    settings: [
      {
        prefix: 'all',
        indices: [
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        data_sources: [
          ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
          ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
          ['auditbeat-*'],
        ],
      },
    ],
  };

  beforeEach(() => {
    mockTransformSetting = {
      enabled: true,
      auto_start: true,
      auto_create: true,
      query: {
        range: {
          '@timestamp': {
            gte: 'now-1d/d',
            format: 'strict_date_optional_time',
          },
        },
      },
      retention_policy: {
        time: {
          field: '@timestamp',
          max_age: '1w',
        },
      },
      max_page_search_size: 5000,
      settings: [
        {
          prefix: 'all',
          indices: [
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          data_sources: [
            ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
            ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
            ['auditbeat-*'],
          ],
        },
      ],
    };
  });

  test('returns transformed settings if we have a matching index to data source and our timerange is greater than an hour', () => {
    expect(
      getTransformChangesIfTheyExist({
        factoryQueryType: HostsQueries.authentications,
        indices: ['auditbeat-*'],
        transformSettings: mockTransformSetting,
        filterQuery: undefined,
        histogramType: undefined,
        timerange: {
          to: '2021-07-06T23:49:38.643Z',
          from: '2021-07-06T20:49:38.643Z',
          interval: '5m',
        },
      })
    ).toMatchObject<Partial<ReturnTypeGetTransformChangesIfTheyExist>>({
      indices: ['.estc_all_user_ent*'],
      factoryQueryType: HostsQueries.authenticationsEntities,
    });
  });

  test('returns transformed settings if we have a matching index to data source and our timerange is greater than an hour and we have a filter set', () => {
    expect(
      getTransformChangesIfTheyExist({
        factoryQueryType: HostsQueries.authentications,
        indices: ['auditbeat-*'],
        transformSettings: mockTransformSetting,
        filterQuery: {
          bool: {
            must: [],
            filter: [{ match_all: {} }],
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
      indices: ['.estc_all_user_ent*'],
      factoryQueryType: HostsQueries.authenticationsEntities,
    });
  });

  test('returns regular settings if our settings is disabled', () => {
    mockTransformSetting = { ...mockTransformSetting, enabled: false };
    expect(
      getTransformChangesIfTheyExist({
        factoryQueryType: HostsQueries.authentications,
        indices: ['auditbeat-*'],
        transformSettings: mockTransformSetting,
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
      factoryQueryType: HostsQueries.authentications,
    });
  });

  test('returns regular settings if filter is set to something other than match_all', () => {
    mockTransformSetting = { ...mockTransformSetting, enabled: false };
    expect(
      getTransformChangesIfTheyExist({
        factoryQueryType: HostsQueries.authentications,
        indices: ['auditbeat-*'],
        transformSettings: mockTransformSetting,
        filterQuery: {
          bool: {
            must: [],
            filter: [{ match_none: {} }],
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
      factoryQueryType: HostsQueries.authentications,
    });
  });
});

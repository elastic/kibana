/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformConfigSchema } from '../../../common/transforms/types';
import { getSettingsMatch } from './get_settings_match';

/** Get the return type of createIndicesFromPrefix for TypeScript checks against expected */
type ReturnTypeCreateIndicesFromPrefix = ReturnType<typeof getSettingsMatch>;

describe('get_settings_match', () => {
  const mockTransformSetting: TransformConfigSchema = {
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

  test('it returns undefined given an empty array of indices', () => {
    expect(
      getSettingsMatch({
        indices: [],
        transformSettings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(undefined);
  });

  test('it returns a setting given an index pattern that matches', () => {
    expect(
      getSettingsMatch({
        indices: [
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        transformSettings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(mockTransformSetting.settings[0]);
  });

  test('it returns a setting given an index pattern that matches even if the indices are different order', () => {
    expect(
      getSettingsMatch({
        indices: [
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'auditbeat-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        transformSettings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(mockTransformSetting.settings[0]);
  });

  test('it returns a setting given an index pattern that matches and removes any that have a dash in them meaning to subtract them', () => {
    expect(
      getSettingsMatch({
        indices: [
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'auditbeat-*',
          'packetbeat-*',
          'winlogbeat-*',
          '-subtract-1', // extra dashed one that should still allow a match
          '-subtract-2', // extra dashed one that should still allow a match
        ],
        transformSettings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(mockTransformSetting.settings[0]);
  });

  test('it returns "undefined" given a set of indices that do not match a setting', () => {
    expect(
      getSettingsMatch({
        indices: ['endgame-*', 'filebeat-*', 'logs-*', 'auditbeat-*', 'packetbeat-*'],
        transformSettings: mockTransformSetting,
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(undefined);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSettingsMatch } from './get_settings_match';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';

/** Get the return type of createIndicesFromPrefix for TypeScript checks against expected */
type ReturnTypeCreateIndicesFromPrefix = ReturnType<typeof getSettingsMatch>;

describe('get_settings_match', () => {
  test('it returns undefined given an empty array of indices', () => {
    expect(
      getSettingsMatch({
        indices: [],
        transformSettings: getTransformConfigSchemaMock(),
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
        transformSettings: getTransformConfigSchemaMock(),
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(getTransformConfigSchemaMock().settings[0]);
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
        transformSettings: getTransformConfigSchemaMock(),
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(getTransformConfigSchemaMock().settings[0]);
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
        transformSettings: getTransformConfigSchemaMock(),
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(getTransformConfigSchemaMock().settings[0]);
  });

  test('it returns "undefined" given a set of indices that do not match a setting', () => {
    expect(
      getSettingsMatch({
        indices: ['endgame-*', 'filebeat-*', 'logs-*', 'auditbeat-*', 'packetbeat-*'],
        transformSettings: getTransformConfigSchemaMock(),
      })
    ).toEqual<ReturnTypeCreateIndicesFromPrefix>(undefined);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  deserializeRepositorySettings,
  serializeRepositorySettings,
} from './repository_serialization';

describe('repository_serialization', () => {
  describe('deserializeRepositorySettings()', () => {
    it('should deserialize repository settings', () => {
      expect(
        deserializeRepositorySettings({
          uri: 'test://uri',
          path: '/foo/bar',
          load_defaults: true,
          compress: false,
          chunk_size: null,
          security: {
            principal: 'fooBar',
          },
          conf: {
            some_setting: 'test',
          },
        })
      ).toEqual({
        uri: 'test://uri',
        path: '/foo/bar',
        loadDefaults: true,
        compress: false,
        chunkSize: null,
        'security.principal': 'fooBar',
        'conf.some_setting': 'test',
      });
    });
  });

  describe('serializeRepositorySettings()', () => {
    it('should serialize repository settings', () => {
      expect(
        serializeRepositorySettings({
          uri: 'test://uri',
          path: '/foo/bar',
          loadDefaults: true,
          compress: false,
          chunkSize: null,
          'security.principal': 'fooBar',
          'conf.some_setting': 'test',
        })
      ).toEqual({
        uri: 'test://uri',
        path: '/foo/bar',
        load_defaults: true,
        compress: false,
        chunk_size: null,
        'security.principal': 'fooBar',
        'conf.some_setting': 'test',
      });
    });
  });
});

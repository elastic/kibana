/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { telemetrySavedObjectMigrations } from './telemetry_saved_object_migrations';

describe('Telemetry saved object migration', () => {
  describe('7.16.0', () => {
    test('removes ui_open and ui_reindex attributes while preserving other attributes', () => {
      const doc = {
        type: 'upgrade-assistant-telemetry',
        id: 'upgrade-assistant-telemetry',
        attributes: {
          'test.property': 5,
          'ui_open.cluster': 1,
          'ui_open.indices': 1,
          'ui_open.overview': 1,
          'ui_reindex.close': 1,
          'ui_reindex.open': 1,
          'ui_reindex.start': 1,
          'ui_reindex.stop': 1,
        },
        references: [],
        updated_at: '2021-09-29T21:17:17.410Z',
        migrationVersion: {},
      };

      expect(telemetrySavedObjectMigrations['7.16.0'](doc)).toStrictEqual({
        type: 'upgrade-assistant-telemetry',
        id: 'upgrade-assistant-telemetry',
        attributes: { 'test.property': 5 },
        references: [],
        updated_at: '2021-09-29T21:17:17.410Z',
        migrationVersion: {},
      });
    });
  });
});

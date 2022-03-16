/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { getLensFilterMigrations } from './common_migrations';

describe('Lens migrations', () => {
  describe('applying filter migrations', () => {
    it('creates a filter migrations map that works on a lens visualization', () => {
      const filterMigrations = {
        '1.1': (filters: Filter[]) => filters.map((filter) => ({ ...filter, version: '1.1' })),
        '2.2': (filters: Filter[]) => filters.map((filter) => ({ ...filter, version: '2.2' })),
        '3.3': (filters: Filter[]) => filters.map((filter) => ({ ...filter, version: '3.3' })),
      };

      const lensVisualizationSavedObject = {
        attributes: {
          state: {
            filters: [{}, {}],
          },
        },
      };

      const migrationMap = getLensFilterMigrations(filterMigrations);

      expect(migrationMap['1.1'](lensVisualizationSavedObject).attributes.state.filters).toEqual([
        { version: '1.1' },
        { version: '1.1' },
      ]);
      expect(migrationMap['2.2'](lensVisualizationSavedObject).attributes.state.filters).toEqual([
        { version: '2.2' },
        { version: '2.2' },
      ]);
      expect(migrationMap['3.3'](lensVisualizationSavedObject).attributes.state.filters).toEqual([
        { version: '3.3' },
        { version: '3.3' },
      ]);
    });
  });
});

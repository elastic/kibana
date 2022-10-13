/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { migrateDataPersistedState } from './migrate_data_persisted_state';

const attributes = {
  title: 'My map',
  mapStateJSON:
    '{"filters":[{"meta":{"index":"90943e30-9a47-11e8-b64d-95841ca0b247","params":{"lt":10000,"gte":2000},"field":"bytes","alias":null,"negate":false,"disabled":false,"type":"range","key":"bytes"},"query":{"range":{"bytes":{"lt":10000,"gte":2000}}},"$state":{"store":"appState"}}]}',
};

const filterMigrationMock = (filters: Filter[]): Filter[] => {
  return filters.map((filter) => {
    return {
      ...filter,
      alias: 'filter_has_been_migrated',
    };
  });
};

test('should apply data migrations to data peristed data', () => {
  const { mapStateJSON } = migrateDataPersistedState({ attributes }, filterMigrationMock);
  const mapState = JSON.parse(mapStateJSON!);
  expect(mapState.filters[0].alias).toEqual('filter_has_been_migrated');
});

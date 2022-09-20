/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Serializable } from '@kbn/utility-types';
import { migrateDataViewsPersistedState } from './migrate_data_view_persisted_state';

const migrationMock = (spec: Serializable): Serializable => {
  return {
    ...(spec as unknown as Record<string, unknown>),
    newProp: 'somethingThatChanged',
  } as unknown as Serializable;
};

test('should apply data view migrations to adhoc data view specs', () => {
  const attributes = {
    title: 'My map',
    mapStateJSON: JSON.stringify({
      adHocDataViews: [{ id: 'myAdHocDataView' }],
    }),
  };
  const { mapStateJSON } = migrateDataViewsPersistedState({ attributes }, migrationMock);
  expect(JSON.parse(mapStateJSON!)).toEqual({
    adHocDataViews: [{ id: 'myAdHocDataView', newProp: 'somethingThatChanged' }],
  });
});

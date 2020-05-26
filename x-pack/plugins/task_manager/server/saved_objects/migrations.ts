/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectMigrationMap } from '../../../../../src/core/server';

export const migrations: SavedObjectMigrationMap = {
  '7.4.0': (doc) => ({
    ...doc,
    updated_at: new Date().toISOString(),
  }),
  '7.6.0': moveIntervalIntoSchedule,
};

// Type is wrong here and will be fixed by platform in https://github.com/elastic/kibana/issues/64748
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function moveIntervalIntoSchedule({ attributes: { interval, ...attributes }, ...doc }: any): any {
  return {
    ...doc,
    attributes: {
      ...attributes,
      ...(interval
        ? {
            schedule: {
              interval,
            },
          }
        : {}),
    },
  };
}

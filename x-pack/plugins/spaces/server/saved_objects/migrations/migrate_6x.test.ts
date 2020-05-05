/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { migrateToKibana660 } from './migrate_6x';
import { SavedObjectMigrationContext } from 'src/core/server';

const mockContext = {} as SavedObjectMigrationContext;

describe('migrateTo660', () => {
  it('adds a "disabledFeatures" attribute initialized as an empty array', () => {
    expect(
      migrateToKibana660(
        {
          id: 'space:foo',
          type: 'space',
          attributes: {},
        },
        mockContext
      )
    ).toEqual({
      id: 'space:foo',
      type: 'space',
      attributes: {
        disabledFeatures: [],
      },
    });
  });

  it('does not initialize "disabledFeatures" if the property already exists', () => {
    // This scenario shouldn't happen organically. Protecting against defects in the migration.
    expect(
      migrateToKibana660(
        {
          id: 'space:foo',
          type: 'space',
          attributes: {
            disabledFeatures: ['foo', 'bar', 'baz'],
          },
        },
        mockContext
      )
    ).toEqual({
      id: 'space:foo',
      type: 'space',
      attributes: {
        disabledFeatures: ['foo', 'bar', 'baz'],
      },
    });
  });
});

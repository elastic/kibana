/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrationMocks } from '@kbn/core/server/mocks';
import { SavedObjectReference } from '@kbn/core/server';
import {
  inventoryDefaultViewReferenceName,
  logIndexPatternReferenceName,
} from '../saved_object_references';
import { extractInventoryDefaultViewReference } from './7_16_2_extract_inventory_default_view_reference';
import { createTestSourceConfiguration } from './create_test_source_configuration';

describe('infra source configuration migration function for inventory default views in 7.16.2', () => {
  test('migrates the inventoryDefaultView to be a reference', () => {
    const initialReferences: SavedObjectReference[] = [
      {
        type: 'index-pattern',
        name: logIndexPatternReferenceName,
        id: 'TEST LOG INDEX PATTERN',
      },
    ];
    const unmigratedConfiguration = createTestSourceConfiguration(
      {
        inventoryDefaultView: 'TEST UUID',
      },
      initialReferences
    );

    const migratedConfiguration = extractInventoryDefaultViewReference(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(
      createTestSourceConfiguration(
        {
          inventoryDefaultView: inventoryDefaultViewReferenceName,
        },
        [
          ...initialReferences,
          {
            type: 'inventory-view',
            name: inventoryDefaultViewReferenceName,
            id: 'TEST UUID',
          },
        ]
      )
    );
  });

  test('ignores already migrated inventoryDefaultView references', () => {
    const initialReferences: SavedObjectReference[] = [
      {
        type: 'index-pattern',
        name: logIndexPatternReferenceName,
        id: 'TEST LOG INDEX PATTERN',
      },
      {
        type: 'inventory-view',
        name: inventoryDefaultViewReferenceName,
        id: 'TEST UUID',
      },
    ];
    const unmigratedConfiguration = createTestSourceConfiguration(
      {
        inventoryDefaultView: inventoryDefaultViewReferenceName,
      },
      initialReferences
    );

    const migratedConfiguration = extractInventoryDefaultViewReference(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(
      createTestSourceConfiguration(
        {
          inventoryDefaultView: inventoryDefaultViewReferenceName,
        },
        initialReferences
      )
    );
  });
});

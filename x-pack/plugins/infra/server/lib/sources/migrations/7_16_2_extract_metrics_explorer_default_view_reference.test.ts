/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrationMocks } from '@kbn/core/server/mocks';
import { SavedObjectReference } from '@kbn/core/server';
import {
  logIndexPatternReferenceName,
  metricsExplorerDefaultViewReferenceName,
} from '../saved_object_references';
import { extractMetricsExplorerDefaultViewReference } from './7_16_2_extract_metrics_explorer_default_view_reference';
import { createTestSourceConfiguration } from './create_test_source_configuration';

describe('infra source configuration migration function for metrics explorer default views in 7.16.2', () => {
  test('migrates the metricsExplorerDefaultView to be a reference', () => {
    const initialReferences: SavedObjectReference[] = [
      {
        type: 'index-pattern',
        name: logIndexPatternReferenceName,
        id: 'TEST LOG INDEX PATTERN',
      },
    ];
    const unmigratedConfiguration = createTestSourceConfiguration(
      {
        metricsExplorerDefaultView: 'TEST UUID',
      },
      initialReferences
    );

    const migratedConfiguration = extractMetricsExplorerDefaultViewReference(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(
      createTestSourceConfiguration(
        {
          metricsExplorerDefaultView: metricsExplorerDefaultViewReferenceName,
        },
        [
          ...initialReferences,
          {
            type: 'metrics-explorer-view',
            name: metricsExplorerDefaultViewReferenceName,
            id: 'TEST UUID',
          },
        ]
      )
    );
  });

  test('ignores already migrated metricsExplorerDefaultView references', () => {
    const initialReferences: SavedObjectReference[] = [
      {
        type: 'index-pattern',
        name: logIndexPatternReferenceName,
        id: 'TEST LOG INDEX PATTERN',
      },
      {
        type: 'metrics-explorer-view',
        name: metricsExplorerDefaultViewReferenceName,
        id: 'TEST UUID',
      },
    ];
    const unmigratedConfiguration = createTestSourceConfiguration(
      {
        metricsExplorerDefaultView: metricsExplorerDefaultViewReferenceName,
      },
      initialReferences
    );

    const migratedConfiguration = extractMetricsExplorerDefaultViewReference(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(
      createTestSourceConfiguration(
        {
          metricsExplorerDefaultView: metricsExplorerDefaultViewReferenceName,
        },
        initialReferences
      )
    );
  });
});

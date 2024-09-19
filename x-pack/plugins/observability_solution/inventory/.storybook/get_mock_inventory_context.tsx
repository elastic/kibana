/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DatasetQualityPluginStart } from '@kbn/dataset-quality-plugin/public';
import type { EntityManagerPublicPluginStart } from '@kbn/entityManager-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { InventoryKibanaContext } from '../public/hooks/use_kibana';

export function getMockInventoryContext(): InventoryKibanaContext {
  const core = coreMock.createStart();

  return {
    core,
    dependencies: {
      start: {
        observabilityShared: {} as unknown as ObservabilitySharedPluginStart,
        inference: {} as unknown as InferencePublicStart,
        dataViews: {} as unknown as DataViewsPublicPluginStart,
        data: {} as unknown as DataPublicPluginStart,
        datasetQuality: {} as unknown as DatasetQualityPluginStart,
        entityManager: {} as unknown as EntityManagerPublicPluginStart,
        fieldFormats: {} as unknown as FieldFormatsStart,
        share: {} as unknown as SharePluginStart,
        unifiedSearch: {} as unknown as UnifiedSearchPublicPluginStart,
      },
    },
    services: {
      inventoryAPIClient: {
        fetch: jest.fn(),
        stream: jest.fn(),
      },
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EntityManagerPublicPluginStart } from '@kbn/entityManager-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { InventoryKibanaContext } from '../public/hooks/use_kibana';
import type { ITelemetryClient } from '../public/services/telemetry/types';

export function getMockInventoryContext(): InventoryKibanaContext {
  const coreStart = coreMock.createStart();

  return {
    ...coreStart,
    entityManager: {} as unknown as EntityManagerPublicPluginStart,
    observabilityShared: {} as unknown as ObservabilitySharedPluginStart,
    inference: {} as unknown as InferencePublicStart,
    share: {} as unknown as SharePluginStart,
    telemetry: {} as unknown as ITelemetryClient,
    unifiedSearch: {} as unknown as UnifiedSearchPublicPluginStart,
    dataViews: {} as unknown as DataViewsPublicPluginStart,
    data: {} as unknown as DataPublicPluginStart,
    inventoryAPIClient: {
      fetch: jest.fn(),
      stream: jest.fn(),
    },
    spaces: {} as unknown as SpacesPluginStart,
    kibanaEnvironment: {
      isCloudEnv: false,
      isServerlessEnv: false,
      kibanaVersion: '9.0.0',
    },
  };
}

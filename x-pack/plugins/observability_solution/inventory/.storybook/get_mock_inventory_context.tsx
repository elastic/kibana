/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { InventoryKibanaContext } from '../public/hooks/use_kibana';
import type { ITelemetryClient } from '../public/services/telemetry/types';

export function getMockInventoryContext(): InventoryKibanaContext {
  const coreStart = coreMock.createStart();

  return {
    ...coreStart,
    observabilityShared: {} as unknown as ObservabilitySharedPluginStart,
    inference: {} as unknown as InferencePublicStart,
    share: {} as unknown as SharePluginStart,
    telemetry: {} as unknown as ITelemetryClient,
    inventoryAPIClient: {
      fetch: jest.fn(),
      stream: jest.fn(),
    },
  };
}

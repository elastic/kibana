/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { InventoryKibanaContext } from '../public/hooks/use_kibana';

export function getMockInventoryContext(): InventoryKibanaContext {
  const core = coreMock.createStart();

  return {
    core,
    dependencies: {
      start: {
        observabilityShared: {} as unknown as ObservabilitySharedPluginStart,
      },
    },
    services: {
      callInventoryApi: jest.fn(),
    },
  };
}

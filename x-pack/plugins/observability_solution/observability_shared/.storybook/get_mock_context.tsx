/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { CoreStart } from '@kbn/core/public';

export type ObservabilitySharedKibanaContext = CoreStart;

export function getMockContext(): ObservabilitySharedKibanaContext {
  const coreStart = coreMock.createStart();

  return {
    ...coreStart,
  };
}

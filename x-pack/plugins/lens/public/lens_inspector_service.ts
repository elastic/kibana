/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Adapters,
  Start as InspectorStartContract,
} from '../../../../src/plugins/inspector/public';

import { createDefaultInspectorAdapters } from '../../../../src/plugins/expressions/public';

export const getLensInspectorService = (inspector: InspectorStartContract) => {
  const adapters: Adapters = createDefaultInspectorAdapters();
  return {
    adapters,
    inspect: () => inspector.open(adapters),
  };
};

export type LensInspector = ReturnType<typeof getLensInspectorService>;

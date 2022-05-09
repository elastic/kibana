/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Adapters,
  InspectorOptions,
  InspectorSession,
  Start as InspectorStartContract,
} from '@kbn/inspector-plugin/public';

import { createDefaultInspectorAdapters } from '@kbn/expressions-plugin/public';

export const getLensInspectorService = (inspector: InspectorStartContract) => {
  const adapters: Adapters = createDefaultInspectorAdapters();
  let overlayRef: InspectorSession | undefined;
  return {
    adapters,
    inspect: (options?: InspectorOptions) => {
      overlayRef = inspector.open(adapters, options);
      overlayRef.onClose.then(() => {
        if (overlayRef) {
          overlayRef = undefined;
        }
      });
      return overlayRef;
    },
    close: () => overlayRef?.close(),
  };
};

export type LensInspector = ReturnType<typeof getLensInspectorService>;

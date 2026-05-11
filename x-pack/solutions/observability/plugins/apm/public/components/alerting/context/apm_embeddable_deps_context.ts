/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { EmbeddableDeps } from '../../../embeddable/types';

/**
 * Carries fully-resolved APM `EmbeddableDeps` through React.
 *
 * Populated by `createLazyApmComponentWithContext` for APM components rendered outside
 * the APM app shell (e.g. alert details sections shown by the observability plugin),
 * so that those components can render APM embeddables inside their own
 * `ApmEmbeddableContext` without depending on the async `registerEmbeddables` registry.
 *
 * Will be `null` when the lazy wrapper was created without setup deps (legacy callers).
 */
export const ApmEmbeddableDepsContext = createContext<EmbeddableDeps | null>(null);

export function useApmEmbeddableDeps(): EmbeddableDeps | null {
  return useContext(ApmEmbeddableDepsContext);
}

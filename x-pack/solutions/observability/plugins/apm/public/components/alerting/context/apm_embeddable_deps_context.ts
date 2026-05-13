/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { EmbeddableDeps } from '../../../embeddable/types';

/** APM `EmbeddableDeps` for components rendered outside the APM app shell. */
export const ApmEmbeddableDepsContext = createContext<EmbeddableDeps | null>(null);

export function useApmEmbeddableDeps(): EmbeddableDeps | null {
  return useContext(ApmEmbeddableDepsContext);
}

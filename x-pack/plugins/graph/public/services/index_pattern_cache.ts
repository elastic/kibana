/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPatternProvider } from '../types';
import type { DataView } from '../../../../../src/plugins/data_views/public';

export function createCachedIndexPatternProvider(
  indexPatternGetter: (id: string) => Promise<DataView>
): IndexPatternProvider {
  const cache = new Map<string, DataView>();

  return {
    get: async (id: string) => {
      if (!cache.has(id)) {
        cache.set(id, await indexPatternGetter(id));
      }
      return Promise.resolve(cache.get(id)!);
    },
  };
}

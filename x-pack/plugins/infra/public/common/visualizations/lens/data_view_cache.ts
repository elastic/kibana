/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewSpec, DataView } from '@kbn/data-plugin/common';

export const DEFAULT_AD_HOC_DATA_VIEW_ID = 'infra_lens_ad_hoc_default';

export class DataViewCache {
  private static instance: DataViewCache;
  private cache = new Map<string, DataViewSpec>();

  private constructor() {}

  public static getInstance(): DataViewCache {
    if (!DataViewCache.instance) {
      DataViewCache.instance = new DataViewCache();
    }

    return DataViewCache.instance;
  }

  public getSpec(dataView: DataView): DataViewSpec {
    const key = dataView.id ?? DEFAULT_AD_HOC_DATA_VIEW_ID;
    const spec = this.cache.get(key);

    if (!spec) {
      const result = dataView.toSpec();
      this.cache.set(key, result); // Cache the new instance
      return result;
    }

    return spec;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition } from '@kbn/share-plugin/public';

export const SEARCH_PROFILER_LOCATOR_ID = 'SEARCH_PROFILER_LOCATOR';

export interface SearchProfilerLocatorParams extends SerializableRecord {
  loadFrom: string;
  index: string;
}

export class SearchProfilerLocatorDefinition
  implements LocatorDefinition<SearchProfilerLocatorParams>
{
  public readonly id = SEARCH_PROFILER_LOCATOR_ID;

  public readonly getLocation = async ({ loadFrom, index }: SearchProfilerLocatorParams) => {
    const indexQueryParam = index ? `?index=${index}` : '';
    const loadFromQueryParam = index && loadFrom ? `&load_from=${loadFrom}` : '';

    return {
      app: 'dev_tools',
      path: `#/searchprofiler${indexQueryParam}${loadFromQueryParam}`,
      state: { loadFrom, index },
    };
  };
}

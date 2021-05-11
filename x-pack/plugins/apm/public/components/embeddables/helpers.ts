/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { Filter } from '../../../../../../src/plugins/data/public';

function removeUndefined(filter: any[] | undefined): filter is [string, any] {
  return !isEmpty(filter);
}

export function getApiFiltersFromInput(
  filters: Filter[],
  apiFilterOptionsMap: Record<string, string>
) {
  return Object.fromEntries(
    filters
      .map((filter) => {
        const { key } = filter.meta;
        if (key) {
          const apiKey = apiFilterOptionsMap[key];
          if (apiKey) {
            return [apiKey, filter.meta.params.query];
          }
        }
      })
      .filter(removeUndefined)
  );
}

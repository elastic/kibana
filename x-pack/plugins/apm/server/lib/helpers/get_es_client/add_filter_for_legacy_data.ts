/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { OBSERVER_VERSION_MAJOR } from '../../../../common/elasticsearch_fieldnames';
import { ESSearchRequest, ESFilter } from '../../../../typings/elasticsearch';

export function addFilterForLegacyData(
  apmIndices: string[],
  params: ESSearchRequest & {
    body: { query: { bool: { filter: ESFilter[] } } };
  },
  { includeLegacyData = false } = {}
) {
  // search across all data (including data)
  if (includeLegacyData) {
    return params;
  }

  const nextParams = cloneDeep(params);

  // add filter for omitting pre-7.x data
  nextParams.body.query.bool.filter.push({
    range: { [OBSERVER_VERSION_MAJOR]: { gte: 7 } },
  });

  return nextParams;
}

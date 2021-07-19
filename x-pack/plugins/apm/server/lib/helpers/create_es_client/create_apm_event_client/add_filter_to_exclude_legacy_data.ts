/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { OBSERVER_VERSION_MAJOR } from '../../../../../common/elasticsearch_fieldnames';
import {
  ESSearchRequest,
  ESFilter,
} from '../../../../../../../../src/core/types/elasticsearch';

/*
  Adds a range query to the ES request to exclude legacy data
*/

export function addFilterToExcludeLegacyData(
  params: ESSearchRequest & {
    body: { query: { bool: { filter: ESFilter[] } } };
  }
) {
  const nextParams = cloneDeep(params);

  // add filter for omitting pre-7.x data
  nextParams.body.query.bool.filter.push({
    range: { [OBSERVER_VERSION_MAJOR]: { gte: 7 } },
  });

  return nextParams;
}

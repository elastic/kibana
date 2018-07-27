/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { aggTypeFieldFilters } from 'ui/agg_types/param_types/filter';

/**
 * If rollup index pattern, check its capabilities
 * and limit available fields for a given aggType based on that.
 */
aggTypeFieldFilters.addFilter(
  (field, fieldParamType, indexPattern, aggConfig) => {
    if(indexPattern.type !== 'rollup') {
      return true;
    }
    const aggName = aggConfig.type.name;
    const aggFields = indexPattern.typeMeta.aggs && indexPattern.typeMeta.aggs[aggName];
    return aggFields && aggFields[field.name];
  }
);

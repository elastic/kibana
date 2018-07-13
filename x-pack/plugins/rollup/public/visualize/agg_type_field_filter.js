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

    const fieldName = field.name;
    const aggName = aggConfig.type.name;
    const jobs = indexPattern.typeMeta.jobs;

    return !!jobs.find(job => {
      const fields = indexPattern.typeMeta.capabilities[job].fields;
      return fields[fieldName] && fields[fieldName].find(agg => agg.agg === aggName);
    });
  }
);

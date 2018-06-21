/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { aggTypeFilters } from 'ui/agg_types/filter';
import { uniq } from 'lodash';

/**
 * If rollup index pattern, check its capabilities
 * and limit available aggregations based on that.
 */
aggTypeFilters.addFilter(
  (aggType, indexPattern) => {
    if(indexPattern.type !== 'rollup') {
      return true;
    }

    const jobs = indexPattern.typeMeta.jobs;
    let allAggs = [];

    jobs.forEach(job => {
      const fields = indexPattern.typeMeta.capabilities[job].fields;
      Object.keys(fields).forEach(field => {
        allAggs = [...allAggs, ...fields[field].map(agg => agg.agg)];
      });
    });

    return uniq(allAggs).includes(aggType.name);
  }
);

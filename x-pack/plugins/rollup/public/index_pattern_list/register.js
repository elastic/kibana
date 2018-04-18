/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { IndexPatternListRegistry } from 'ui/management';

IndexPatternListRegistry.register(() => {
  return class RollupIndexPatternList {
    static key = 'rollup';

    getIndexPatternTags = (indexPattern) => {
      const tags = [];
      if(indexPattern.type === 'rollup' || (indexPattern.get && indexPattern.get('type') === 'rollup')) {
        tags.push({
          key: 'rollup',
          name: 'Rollup',
        });

        if(indexPattern.typeMeta && indexPattern.typeMeta.jobs) {
          tags.push({
            key: 'rollup_jobs',
            name: `Rollup jobs: ${indexPattern.typeMeta.jobs.join(', ')}`,
          });
        }
      }
      return tags;
    }

    getFieldInfo = (indexPattern, field) => {
      const jobs = indexPattern.typeMeta && indexPattern.typeMeta.jobs;
      const capabilities = jobs && indexPattern.typeMeta.capabilities && indexPattern.typeMeta.capabilities[jobs[0]].fields[field];

      if(!capabilities) {
        return [];
      }

      return ['Rollup capabilities:'].concat(capabilities.map(cap => {
        if(cap.agg === 'date_histogram') {
          return `${cap.agg} (interval: ${cap.interval}, ${cap.delay ? `delay: ${cap.delay},` : ''} ${cap.time_zone})`;
        } else if(cap.agg === 'histogram') {
          return `${cap.agg} (interval: ${cap.interval})`;
        } else {
          return cap.agg;
        }
      }));
    }
  };
});

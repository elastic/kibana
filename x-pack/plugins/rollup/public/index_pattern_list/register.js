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
      }
      return tags;
    }

    getFieldInfo = (indexPattern, field) => {
      const allAggs = indexPattern.typeMeta && indexPattern.typeMeta.aggs;
      const fieldAggs = allAggs && Object.keys(allAggs).filter(agg => allAggs[agg][field] && Array.isArray(allAggs[agg][field]));

      if(!fieldAggs || !fieldAggs.length) {
        return [];
      }

      return ['Rollup aggregations:'].concat(fieldAggs.map(aggName => {
        const agg = allAggs[aggName][field];
        switch(aggName) {
          case 'date_histogram':
            return `${aggName} (interval: ${agg.interval}, ${agg.delay ? `delay: ${agg.delay},` : ''} ${agg.time_zone})`;
            break;
          case 'histogram':
            return `${aggName} (interval: ${agg.interval})`;
          default:
            return aggName;
        }
      }));
    }
  };
});

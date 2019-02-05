/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { editorConfigProviders } from 'ui/vis/editors/config/editor_config_providers';

export function initEditorConfig() {
  // Limit agg params based on rollup capabilities
  editorConfigProviders.register((aggType, indexPattern, aggConfig) => {
    if(indexPattern.type !== 'rollup') {
      return {};
    }

    const aggTypeName = aggConfig.type && aggConfig.type.name;

    // Exclude certain param options for terms:
    // otherBucket, missingBucket, orderBy, orderAgg
    if(aggTypeName === 'terms') {
      return {
        otherBucket: {
          hidden: true
        },
        missingBucket: {
          hidden: true
        },
      };
    }

    const rollupAggs = indexPattern.typeMeta && indexPattern.typeMeta.aggs;
    const field = aggConfig.params && aggConfig.params.field && aggConfig.params.field.name;
    const fieldAgg = rollupAggs && field && rollupAggs[aggTypeName] && rollupAggs[aggTypeName][field];

    if(!rollupAggs || !field || !fieldAgg) {
      return {};
    }

    // Set interval and base interval for histograms based on rollup capabilities
    if(aggTypeName === 'histogram') {
      const interval = fieldAgg.interval;
      return interval ? {
        intervalBase: {
          fixedValue: interval
        },
        interval: {
          base: interval,
          help: `Must be a multiple of rollup configuration interval: ${interval}`
        }
      } : {};
    }

    // Set date histogram time zone based on rollup capabilities
    if (aggTypeName === 'date_histogram') {
      const timezone = fieldAgg.time_zone || 'UTC';
      const interval = fieldAgg.interval;
      return {
        time_zone: {
          fixedValue: timezone,
        },
        interval: {
          fixedValue: 'custom',
        },
        useNormalizedEsInterval: {
          fixedValue: false,
        },
        customInterval: {
          default: interval,
          timeBase: interval,
          help: `Must be a multiple of rollup configuration interval: ${interval}`
        }
      };
    }

    return {};
  });
}

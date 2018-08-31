/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import moment from 'moment';
import { InfraESSearchBody, InfraProcesorRequestOptions } from '../../adapter_types';
import { createBasePath } from '../../lib/create_base_path';
const intervalUnits = ['y', 'M', 'w', 'd', 'h', 'm', 's', 'ms'];
const INTERVAL_STRING_RE = new RegExp('^([0-9\\.]*)\\s*(' + intervalUnits.join('|') + ')$');

interface UnitsToSeconds {
  [unit: string]: number;
}

const units: UnitsToSeconds = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7,
  M: 86400 * 30,
  y: 86400 * 356,
};

const getBucketSizeInSeconds = (interval: string): number => {
  const matches = interval.match(INTERVAL_STRING_RE);
  if (matches) {
    return Number(matches[1]) * units[matches[2]];
  }
  return 60;
};
export const dateHistogramProcessor = (options: InfraProcesorRequestOptions) => {
  return (doc: InfraESSearchBody) => {
    const { timerange, sourceConfiguration, groupBy } = options.nodeOptions;
    const bucketSizeInSeconds = getBucketSizeInSeconds(timerange.interval);
    const boundsMin = moment
      .utc(timerange.from)
      .subtract(5 * bucketSizeInSeconds, 's')
      .valueOf();
    const path = createBasePath(groupBy).concat('timeseries');
    set(doc, path, {
      date_histogram: {
        field: sourceConfiguration.fields.timestamp,
        interval: timerange.interval,
        min_doc_count: 0,
        extended_bounds: {
          min: boundsMin,
          max: timerange.to,
        },
      },
      aggs: {},
    });
    return doc;
  };
};

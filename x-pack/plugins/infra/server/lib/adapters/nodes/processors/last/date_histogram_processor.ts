/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import moment from 'moment';
import { InfraESSearchBody, InfraProcesorRequestOptions } from '../../adapter_types';
import { createBasePath } from '../../lib/create_base_path';
import { getBucketSizeInSeconds } from '../../lib/get_bucket_size_in_seconds';

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

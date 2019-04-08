/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'lodash/fp';
import {
  InfraESSearchBody,
  InfraProcesorRequestOptions,
  InfraProcessorTransformer,
} from '../../adapter_types';
import { fieldsFilterProcessor } from '../common/field_filter_processor';
import { groupByProcessor } from '../common/group_by_processor';
import { nodesProcessor } from '../common/nodes_processor';
import { queryProcessor } from '../common/query_procssor';
import { dateHistogramProcessor } from './date_histogram_processor';
import { metricBucketsProcessor } from './metric_buckets_processor';

export const createLastNProcessor = (
  options: InfraProcesorRequestOptions
): InfraProcessorTransformer<InfraESSearchBody> => {
  return pipe(
    fieldsFilterProcessor(options),
    nodesProcessor(options),
    queryProcessor(options),
    groupByProcessor(options),
    dateHistogramProcessor(options),
    metricBucketsProcessor(options)
  );
};

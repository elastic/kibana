/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, set } from 'lodash';
import {
  NODE_REQUEST_PARTITION_FACTOR,
  NODE_REQUEST_PARTITION_SIZE,
} from '../../../../common/constants';
import {
  InfraESSearchBody,
  InfraProcesorRequestOptions,
  InfraProcessor,
  InfraProcessorChainFn,
  InfraProcessorTransformer,
} from '../../infra_types';

export const nodesProcessor: InfraProcessor<InfraProcesorRequestOptions, InfraESSearchBody> = (
  options: InfraProcesorRequestOptions
): InfraProcessorChainFn<InfraESSearchBody> => {
  return (next: InfraProcessorTransformer<InfraESSearchBody>) => (doc: InfraESSearchBody) => {
    const result = cloneDeep(doc);
    set(result, 'aggs.waffle.aggs.nodes.terms', {
      field: options.nodeField,
      include: {
        num_partitions: options.numberOfPartitions,
        partition: options.partitionId,
      },
      order: { _key: 'asc' },
      size: NODE_REQUEST_PARTITION_SIZE * NODE_REQUEST_PARTITION_FACTOR,
    });
    return next(result);
  };
};

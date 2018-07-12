/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createProcessorFunction } from '../../adapters/nodes/lib/create_processor_function';
import {
  InfraESSearchBody,
  InfraProcesorRequestOptions,
  InfraProcessor,
  InfraProcessorTransformer,
} from '../../infra_types';
import { fieldsFilterProcessor } from '../common/field_filter_processor';
import { groupByProcessor } from '../common/group_by_processor';
import { nodesProcessor } from '../common/nodes_processor';
import { queryProcessor } from '../common/query_procssor';

const chain: Array<InfraProcessor<InfraProcesorRequestOptions, InfraESSearchBody>> = [
  fieldsFilterProcessor,
  nodesProcessor,
  queryProcessor,
  groupByProcessor,
];

export const createLastNProcessor = (
  options: InfraProcesorRequestOptions
): InfraProcessorTransformer<InfraESSearchBody> => {
  return createProcessorFunction(chain, options);
};

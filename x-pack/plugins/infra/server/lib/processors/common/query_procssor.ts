/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraESSearchBody,
  InfraProcesorRequestOptions,
  InfraProcessor,
  InfraProcessorChainFn,
  InfraProcessorTransformer,
} from '../../infra_types';

import { createQuery } from '../../adapters/nodes/lib/create_query';

import { cloneDeep, set } from 'lodash';

export const queryProcessor: InfraProcessor<InfraProcesorRequestOptions, InfraESSearchBody> = (
  options: InfraProcesorRequestOptions
): InfraProcessorChainFn<InfraESSearchBody> => {
  return (next: InfraProcessorTransformer<InfraESSearchBody>) => (doc: InfraESSearchBody) => {
    const result = cloneDeep(doc);
    set(result, 'size', 0);
    set(result, 'query', createQuery(options.nodeOptions));
    return next(result);
  };
};

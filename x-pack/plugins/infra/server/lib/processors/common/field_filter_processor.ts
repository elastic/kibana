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

import { cloneDeep, set } from 'lodash';

export const fieldsFilterProcessor: InfraProcessor<
  InfraProcesorRequestOptions,
  InfraESSearchBody
> = (
  options: InfraProcesorRequestOptions
): InfraProcessorChainFn<InfraESSearchBody> => {
  return (next: InfraProcessorTransformer<InfraESSearchBody>) => (
    doc: InfraESSearchBody
  ) => {
    const result = cloneDeep(doc);
    /*
     TODO: Need to add the filter logic to find all the fields the user is requesting
     and then add an exists filter for each. That way we are only looking at documents
     that have the correct fields. This is because we are having to run a partioned
     terms agg at the top level. Normally we wouldn't need to do this because they would
     get filter out natually.
     */
    set(result, 'aggs.waffle.filter.match_all', {});
    return next(result);
  };
};

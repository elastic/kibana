/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, set } from 'lodash';

import { InfraESSearchBody, InfraProcesorRequestOptions } from '../../adapter_types';
import { createQuery } from '../../lib/create_query';

export const queryProcessor = (options: InfraProcesorRequestOptions) => {
  return (doc: InfraESSearchBody) => {
    const result = cloneDeep(doc);
    set(result, 'size', 0);
    set(result, 'query', createQuery(options.nodeOptions));
    return result;
  };
};

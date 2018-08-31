/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';

import { InfraESSearchBody, InfraProcesorRequestOptions } from '../../adapter_types';
import { createQuery } from '../../lib/create_query';

export const queryProcessor = (options: InfraProcesorRequestOptions) => {
  return (doc: InfraESSearchBody) => {
    set(doc, 'size', 0);
    set(doc, 'query', createQuery(options.nodeOptions));
    return doc;
  };
};

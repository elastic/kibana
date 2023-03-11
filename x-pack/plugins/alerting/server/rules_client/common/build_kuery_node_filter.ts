/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, KueryNode } from '@kbn/es-query';

export const buildKueryNodeFilter = (filter?: string | KueryNode | null): KueryNode | null => {
  let optionsFilter: KueryNode | string | null = filter ?? null;
  try {
    if (optionsFilter != null && typeof optionsFilter === 'string') {
      // FUTURE ENGINEER -> if I can parse it that mean it is a KueryNode or it is a string
      optionsFilter = JSON.parse(optionsFilter);
    }
  } catch (e) {
    optionsFilter = filter ?? null;
  }
  return optionsFilter
    ? typeof optionsFilter === 'string'
      ? fromKueryExpression(optionsFilter)
      : optionsFilter
    : null;
};

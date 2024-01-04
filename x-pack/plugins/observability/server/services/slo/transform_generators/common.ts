/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { InvalidTransformError } from '../../../errors';

export function getElastichsearchQueryOrThrow(kuery: string | undefined = '') {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidTransformError(`Invalid KQL: ${kuery}`);
  }
}

export function parseIndex(index: string): string | string[] {
  if (index.indexOf(',') === -1) {
    return index;
  }

  return index.split(',');
}

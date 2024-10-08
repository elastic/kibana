/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { InvalidTransformError } from '../errors/invalid_transform_error';

export function getElasticsearchQueryOrThrow(kuery: string) {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidTransformError(`Invalid KQL: ${kuery}`);
  }
}

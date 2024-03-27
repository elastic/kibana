/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { QuerySchema, kqlQuerySchema } from '@kbn/slo-schema';
import { DataView } from '@kbn/data-views-plugin/common';
import { InvalidTransformError } from '../../errors';

export function getElasticsearchQueryOrThrow(kuery: QuerySchema = '', dataView?: DataView) {
  try {
    if (kqlQuerySchema.is(kuery)) {
      return toElasticsearchQuery(fromKueryExpression(kuery));
    } else {
      return buildEsQuery(
        dataView,
        {
          query: kuery?.kqlQuery,
          language: 'kuery',
        },
        kuery?.filters
      );
    }
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

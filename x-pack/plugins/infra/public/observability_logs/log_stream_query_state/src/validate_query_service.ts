/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, EsQueryConfig, isOfQueryType } from '@kbn/es-query';
import type { InvokeCreator } from 'xstate';
import { QueryParsingError, UnsupportedLanguageError } from './errors';
import type { LogStreamQueryContext, LogStreamQueryEvent } from './types';

export const validateQuery =
  ({
    kibanaQuerySettings,
  }: {
    kibanaQuerySettings: EsQueryConfig;
  }): InvokeCreator<LogStreamQueryContext, LogStreamQueryEvent> =>
  (context) =>
  (send) => {
    if (!('query' in context)) {
      throw new Error('Failed to validate query: no query in context');
    }

    const { dataViews, query, filters } = context;

    if (!isOfQueryType(query)) {
      send({
        type: 'VALIDATION_FAILED',
        error: new UnsupportedLanguageError('Failed to validate query: unsupported language'),
      });

      return;
    }

    try {
      const parsedQuery = buildEsQuery(dataViews, query, filters, kibanaQuerySettings);

      send({
        type: 'VALIDATION_SUCCEEDED',
        parsedQuery,
      });
    } catch (error) {
      send({
        type: 'VALIDATION_FAILED',
        error: new QueryParsingError(`${error}`),
      });
    }
  };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, EsQueryConfig, isOfQueryType } from '@kbn/es-query';
import type { InvokeCreator } from 'xstate';
import type { HostsViewQueryContext, HostsViewQueryEvent } from './types';

export const validateQuery =
  ({
    kibanaQuerySettings,
  }: {
    kibanaQuerySettings: EsQueryConfig;
  }): InvokeCreator<HostsViewQueryContext, HostsViewQueryEvent> =>
  (context) =>
  (send) => {
    if (!('query' in context)) {
      throw new Error('Failed to validate query: no query in context');
    }

    const { dataView, query, filters, panelFilters } = context;

    if (!isOfQueryType(query)) {
      send({
        type: 'VALIDATION_FAILED',
        validationError: new Error('Failed to validate query: unsupported language'),
      });

      return;
    }

    try {
      const parsedQuery = buildEsQuery(
        dataView,
        query,
        [...filters, ...panelFilters],
        kibanaQuerySettings
      );

      send({
        type: 'VALIDATION_SUCCEEDED',
        parsedQuery,
      });
    } catch (error) {
      send({
        type: 'VALIDATION_FAILED',
        validationError: new Error(`${error}`),
      });
    }
  };

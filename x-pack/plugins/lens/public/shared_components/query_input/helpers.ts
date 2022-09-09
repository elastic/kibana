/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/es-query';
import { toElasticsearchQuery, fromKueryExpression, luceneStringToDsl } from '@kbn/es-query';
import { IndexPattern } from '../../types';

export const validateQuery = (input: Query | undefined, indexPattern: IndexPattern) => {
  let isValid = true;
  let error: string | undefined;

  try {
    if (input) {
      if (input.language === 'kuery') {
        toElasticsearchQuery(fromKueryExpression(input.query), indexPattern);
      } else {
        luceneStringToDsl(input.query);
      }
    }
  } catch (e) {
    isValid = false;
    error = e.message;
  }

  return { isValid, error };
};

export const isQueryValid = (input: Query, indexPattern: IndexPattern) =>
  validateQuery(input, indexPattern).isValid;

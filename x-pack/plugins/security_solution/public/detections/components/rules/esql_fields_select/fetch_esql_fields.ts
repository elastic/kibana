/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pluck } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { ExpressionsStart, Datatable } from '@kbn/expressions-plugin/public';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';

interface TextBasedLanguagesErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export function fetchFieldsFromESQL(query: Query | AggregateQuery, expressions: ExpressionsStart) {
  return textBasedQueryStateToAstWithValidation({
    query,
  })
    .then((ast) => {
      if (ast) {
        const execution = expressions.run(ast, null);
        let finalData: Datatable;
        let error: string | undefined;
        execution.pipe(pluck('result')).subscribe((resp) => {
          const response = resp as Datatable | TextBasedLanguagesErrorResponse;
          if (response.type === 'error') {
            error = response.error.message;
          } else {
            finalData = response;
          }
        });
        return lastValueFrom(execution).then(() => {
          if (error) {
            throw new Error(error);
          } else {
            return finalData;
          }
        });
      }
      return undefined;
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

function convertKueryToEsQuery(kuery, indexPattern) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}

export function getKqlQueryValues(inputValue, indexPattern) {
  const ast = fromKueryExpression(inputValue);
  const isAndOperator = (ast.function === 'and');
  const query = convertKueryToEsQuery(inputValue, indexPattern);
  const filteredFields = [];

  if (!query) {
    return;
  }

  // if ast.type == 'function' then layout of ast.arguments:
  // [{ arguments: [ { type: 'literal', value: 'AAL' } ] },{ arguments: [ { type: 'literal', value: 'AAL' } ] }]
  if (ast && Array.isArray(ast.arguments)) {

    ast.arguments.forEach((arg) => {
      if (arg.arguments !== undefined) {
        arg.arguments.forEach((nestedArg) => {
          if (typeof nestedArg.value === 'string') {
            filteredFields.push(nestedArg.value);
          }
        });
      } else if (typeof arg.value === 'string') {
        filteredFields.push(arg.value);
      }
    });

  }

  return {
    influencersFilterQuery: query,
    filteredFields,
    queryString: inputValue,
    isAndOperator
  };
}

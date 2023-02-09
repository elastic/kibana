/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, get } from 'lodash';

export const replaceParamsQuery = (query: string, data: object) => {
  const regex = /\{{([^}]+)\}}/g; // when there are 2 opening and 2 closing curly brackets (including brackets)
  const matchedBrackets = query.match(regex);
  let resultQuery = query;

  if (matchedBrackets) {
    each(matchedBrackets, (bracesText: string) => {
      const field = bracesText.replace(/{{|}}/g, '').trim();
      if (resultQuery.includes(bracesText)) {
        const foundFieldValue = get(data, field);
        if (foundFieldValue) {
          resultQuery = resultQuery.replace(bracesText, foundFieldValue);
        }
      }
    });
  }

  const skipped = regex.test(resultQuery);

  return {
    result: resultQuery,
    skipped,
  };
};

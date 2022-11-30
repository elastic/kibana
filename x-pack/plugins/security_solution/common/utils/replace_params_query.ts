/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, get } from 'lodash';

export const replaceParamsQuery = (query: string, data: object) => {
  const regex = /[^{\}]+(?=})/g;
  const matchedBraces = query.match(regex);
  let resultQuery = query;

  if (matchedBraces) {
    each(matchedBraces, (bracesText: string) => {
      if (resultQuery.includes(`{${bracesText}}`)) {
        const foundFieldValue = get(data, bracesText);
        if (foundFieldValue) {
          resultQuery = resultQuery.replace(`{${bracesText}}`, foundFieldValue);
        }
      }
    });
  }

  return resultQuery;
};

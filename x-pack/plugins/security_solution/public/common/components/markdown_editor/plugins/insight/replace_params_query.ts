/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: share this
import { each } from 'lodash';
import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';

export const replaceParamsQuery = (query: string, data?: TimelineEventsDetailsItem[] | null) => {
  const regex = /\{{([^}]+)\}}/g;
  const matchedBrackets = query.match(regex);
  let resultQuery = query;

  if (matchedBrackets && data) {
    each(matchedBrackets, (bracesText: string) => {
      const field = bracesText.replace(/{{|}}/g, '').trim();
      if (resultQuery.includes(bracesText)) {
        const foundField = data.find(({ field: alertField }) => alertField === field);
        if (foundField && foundField.values) {
          const {
            values: [foundFieldValue],
          } = foundField;
          resultQuery = resultQuery.replace(bracesText, foundFieldValue);
        }
      }
    });
  }

  const skipped = regex.test(resultQuery);

  return {
    result: resultQuery,
    skipped,
    matchedBrackets,
  };
};

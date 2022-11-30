/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, reduce } from 'lodash';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

export const replaceParamsQuery = (query: string, data?: TimelineEventsDetailsItem[] | null) => {
  const regex = /[^{\}]+(?=})/g;
  const matchedBraces = query.match(regex);
  let resultQuery = query;

  if (matchedBraces) {
    const fieldsMap: Record<string, string> = reduce(
      data,
      (acc, eventDetailItem) => ({
        ...acc,
        [eventDetailItem.field]: eventDetailItem?.values?.[0],
      }),
      {}
    );
    each(matchedBraces, (bracesText: string) => {
      if (resultQuery.includes(`{${bracesText}}`)) {
        const foundFieldValue = fieldsMap[bracesText];
        if (foundFieldValue) {
          resultQuery = resultQuery.replace(`{${bracesText}}`, foundFieldValue);
        }
      }
    });
  }

  return resultQuery;
};

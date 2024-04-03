/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringMatch } from '../../util/string_utils';
import type {
  TermClause,
  FieldClause,
  Value,
  DataFrameAnalyticsListRow,
} from '../pages/analytics_management/components/analytics_list/common';

export function filterAnalytics(
  items: DataFrameAnalyticsListRow[],
  clauses: Array<TermClause | FieldClause>
) {
  if (clauses.length === 0) {
    return items;
  }

  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return items which match all clauses, i.e. each search term is ANDed
  const matches: Record<string, any> = items.reduce((p: Record<string, any>, c) => {
    p[c.id] = {
      job: c,
      count: 0,
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = c.match === 'must';
    let js = [];

    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on id, description and memory_status
      // if the term has been negated, AND the matches
      if (bool === true) {
        js = items.filter(
          (item) =>
            stringMatch(item.id, c.value) === bool ||
            stringMatch(item.config.description, c.value) === bool ||
            stringMatch(item.stats?.memory_usage?.status, c.value) === bool
        );
      } else {
        js = items.filter(
          (item) =>
            stringMatch(item.id, c.value) === bool &&
            stringMatch(item.config.description, c.value) === bool &&
            stringMatch(item.stats?.memory_usage?.status, c.value) === bool
        );
      }
    } else {
      // filter other clauses, i.e. the filters for type and status
      if (Array.isArray(c.value)) {
        // job type value and status value are an array of string(s) e.g. c.value => ['failed', 'stopped']
        js = items.filter((item) =>
          (c.value as Value[]).includes(
            item[c.field as keyof Pick<typeof item, 'job_type' | 'state'>]
          )
        );
      } else {
        js = items.filter(
          (item) => item[c.field as keyof Pick<typeof item, 'job_type' | 'state'>] === c.value
        );
      }
    }

    js.forEach((j) => matches[j.id].count++);
  });

  // loop through the matches and return only those items which have match all the clauses
  const filtered = Object.values(matches)
    .filter((m) => (m && m.count) >= clauses.length)
    .map((m) => m.job);

  return filtered;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringMatch } from '../../../../../util/string_utils';
import {
  TermClause,
  FieldClause,
  Value,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import { ModelItem } from '../models_management/models_list';

export function filterAnalyticsModels(
  items: ModelItem[],
  clauses: Array<TermClause | FieldClause>
) {
  if (clauses.length === 0) {
    return items;
  }

  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return items which match all clauses, i.e. each search term is ANDed
  const matches: Record<string, any> = items.reduce((p: Record<string, any>, c) => {
    p[c.model_id] = {
      model: c,
      count: 0,
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = c.match === 'must';
    let ms = [];

    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on model_id and type
      // if the term has been negated, AND the matches
      if (bool === true) {
        ms = items.filter(
          (item) =>
            stringMatch(item.model_id, c.value) === bool || stringMatch(item.type, c.value) === bool
        );
      } else {
        ms = items.filter(
          (item) =>
            stringMatch(item.model_id, c.value) === bool && stringMatch(item.type, c.value) === bool
        );
      }
    } else {
      // filter other clauses, i.e. the filters for type
      if (Array.isArray(c.value)) {
        // type value is an array of string(s) e.g. c.value => ['classification']
        ms = items.filter((item) => {
          return item.type !== undefined && (c.value as Value[]).includes(item.type);
        });
      } else {
        ms = items.filter((item) => item[c.field as keyof typeof item] === c.value);
      }
    }

    ms.forEach((j) => matches[j.model_id].count++);
  });

  // loop through the matches and return only those items which have match all the clauses
  const filtered = Object.values(matches)
    .filter((m) => (m && m.count) >= clauses.length)
    .map((m) => m.model);

  return filtered;
}

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

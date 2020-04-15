/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';

function defaultFilterFn(value, query) {
  if (value.toLowerCase().includes(query.toLowerCase())) {
    return true;
  }
  return false;
}

export function filter(data, queryText, fields, filterFn = defaultFilterFn) {
  return data.filter(item => {
    for (const field of fields) {
      if (filterFn(get(item, field), queryText)) {
        return true;
      }
    }
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chain } from 'lodash';

/*
 * Chart titles are taken from `metric.title` or `metric.label` fields in the series data.
 * Use title if found, otherwise use label
 */
export function getTitle(series = []) {
  return chain(
    series.map(s => {
      return s.metric.title || s.metric.label;
    })
  )
    .first()
    .value();
}

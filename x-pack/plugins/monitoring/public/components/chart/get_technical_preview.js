/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chain } from 'lodash';

/*
 * Chart titles are taken from `metric.title` or `metric.label` fields in the series data.
 * Use title if found, otherwise use label
 */
export function getTechnicalPreview(series = []) {
  return chain(
    series.map((s) => {
      return Boolean(s.metric.technicalPreview);
    })
  )
    .first()
    .value();
}

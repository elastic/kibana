/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import datemath from '@elastic/datemath';

export function getAbsoluteTime(range: string, opts = {}) {
  const parsed = datemath.parse(range, opts);
  if (parsed) {
    return parsed.valueOf();
  }
}

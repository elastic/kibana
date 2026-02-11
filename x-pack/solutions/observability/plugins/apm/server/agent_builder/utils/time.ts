/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';

export function parseDatemath(value: string, options?: Parameters<typeof datemath.parse>[1]) {
  return datemath.parse(value, options)?.valueOf() ?? 0;
}

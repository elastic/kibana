/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUndefined, omitBy } from 'lodash';
import { APP_ID } from './constants';

export function makeExecutionContext(context: { id?: string; url?: string; description?: string }) {
  return omitBy(
    {
      name: APP_ID,
      type: 'application',
      ...context,
    },
    isUndefined
  );
}

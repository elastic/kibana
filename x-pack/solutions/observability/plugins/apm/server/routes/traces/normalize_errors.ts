/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { Error } from '@kbn/apm-types';
import type { UnifiedTraceErrors } from './get_unified_trace_errors';

type UnifiedErrors = UnifiedTraceErrors['apmErrors'] | UnifiedTraceErrors['unprocessedOtelErrors'];

export const normalizeErrors = (errors: UnifiedErrors): Error[] =>
  errors.map(
    ({ error, timestamp, eventName }): Error => ({
      eventName,
      error: {
        ...error,
        exception: castArray(error?.exception)[0],
      },
      timestamp,
    })
  );

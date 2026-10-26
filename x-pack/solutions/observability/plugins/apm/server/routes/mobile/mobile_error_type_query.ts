/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery } from '@kbn/observability-plugin/server';
import { MobileErrorType } from '@kbn/apm-types';
import { ERROR_TYPE } from '../../../common/es_fields/apm';

/**
 * Scopes a query to the error documents a mobile errors-and-crashes tab lists: crashes for
 * the crashes tab, everything but crashes for the errors tab. Returns an empty array when no
 * error type is given, so callers can spread it unconditionally.
 */
export function mobileErrorTypeQuery(errorType?: MobileErrorType): QueryDslQueryContainer[] {
  if (!errorType) {
    return [];
  }

  return errorType === MobileErrorType.Crash
    ? termQuery(ERROR_TYPE, MobileErrorType.Crash)
    : [{ bool: { must_not: termQuery(ERROR_TYPE, MobileErrorType.Crash) } }];
}

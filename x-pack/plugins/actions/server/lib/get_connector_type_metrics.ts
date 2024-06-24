/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError, AxiosResponse } from 'axios';
import { RequestMetrics } from '../../common';

export function getRequestMetrics(
  result: AxiosError | AxiosResponse | undefined,
  data: unknown
): RequestMetrics {
  const stringData = typeof data === 'string' ? data : JSON.stringify(data);
  return {
    requestBodyBytes:
      result?.request?.headers?.['Content-Length'] || Buffer.byteLength(stringData, 'utf8'),
  };
}

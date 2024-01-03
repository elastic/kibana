/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object') {
    return (error as { body: KibanaServerError })?.body?.message || '';
  }

  return '';
}

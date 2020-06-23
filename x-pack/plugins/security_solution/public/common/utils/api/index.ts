/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';

export interface KibanaApiError {
  message: string;
  body: {
    message: string;
    status_code: number;
  };
}

export const isApiError = (error: unknown): error is KibanaApiError =>
  has('message', error) && has('body.message', error) && has('body.status_code', error);

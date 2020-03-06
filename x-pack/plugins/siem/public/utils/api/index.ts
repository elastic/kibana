/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface KibanaApiError {
  error: string;
  body: {
    message: string;
    status_code: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isApiError = (error: any): error is KibanaApiError => error?.body?.message;

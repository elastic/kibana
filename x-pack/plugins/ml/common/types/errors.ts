/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ErrorResponse {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes?: any;
  };
  name: string;
}

export function isErrorResponse(arg: any): arg is ErrorResponse {
  return arg?.body?.error !== undefined && arg?.body?.message !== undefined;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface HttpEcs {
  version?: string[];
  request?: HttpRequestData;
  response?: HttpResponseData;
}

export interface HttpRequestData {
  method?: string[];
  body?: HttpBodyData;
  referrer?: string[];
  bytes?: number[];
}

export interface HttpBodyData {
  content?: string[];
  bytes?: number[];
}

export interface HttpResponseData {
  status_code?: number[];
  body?: HttpBodyData;
  bytes?: number[];
}

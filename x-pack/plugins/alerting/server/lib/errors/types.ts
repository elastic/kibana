/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaResponseFactory, IKibanaResponse } from '../../../../../../src/core/server';

export interface ErrorThatHandlesItsOwnResponse extends Error {
  sendResponse(res: KibanaResponseFactory): IKibanaResponse;
}

interface ElasticsearchErrorCausedBy {
  caused_by?: {
    reason?: string;
  };
}

interface ElasticsearchErrorMeta {
  body?: {
    error?: ElasticsearchErrorCausedBy;
  };
}

export interface ElasticsearchError extends Error {
  error?: {
    meta?: ElasticsearchErrorMeta;
  };
  meta?: ElasticsearchErrorMeta;
}

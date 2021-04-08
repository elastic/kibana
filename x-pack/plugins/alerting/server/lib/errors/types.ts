/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApiError } from '@elastic/elasticsearch';
import { KibanaResponseFactory, IKibanaResponse } from '../../../../../../src/core/server';

export interface ErrorThatHandlesItsOwnResponse extends Error {
  sendResponse(res: KibanaResponseFactory): IKibanaResponse;
}

interface ElasticsearchErrorMeta {
  body?: {
    error?: ApiError;
  };
}

export interface ElasticsearchError extends Error {
  error?: {
    meta?: ElasticsearchErrorMeta;
  };
  meta?: ElasticsearchErrorMeta;
}

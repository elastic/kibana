/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';

interface ErrorWithApiResponseMeta extends Error {
  meta: ResponseError['meta'];
}

/**
 * type assertion.
 * Checks to see if an error looks to have a `meta` property that holds an `ApiResponse`
 * @param error
 */
export const isErrorWithMeta = (
  error: Error & { meta?: any }
): error is ErrorWithApiResponseMeta => {
  return error.meta && error.meta.statusCode && error.meta.body;
};

export const isElasticsearchItemNotFoundError = (error: Error): boolean => {
  return isErrorWithMeta(error) && error.meta.statusCode === 404 && error.meta.body.found === false;
};

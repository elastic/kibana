/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';

export async function handle403Exception<T>(
  promise: Promise<T>,
  defaultValue: unknown
) {
  try {
    return await promise;
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      error.meta.statusCode === 403
    ) {
      console.error(`Suppressed insufficient access error: ${error.message}}`);
      return defaultValue as T;
    }

    console.error(
      `Unhandled error: ${error.message} ${JSON.stringify(error)}}`
    );

    throw error;
  }
}

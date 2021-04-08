/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { ElasticsearchError } from './';

interface ErrorObject {
  caused_by?: {
    reason?: string;
    caused_by?: {};
  };
  failed_shards?: Array<{
    reason?: {
      caused_by?: {
        reason?: string;
      };
    };
  }>;
}

const getEsCause = (obj: ErrorObject = {}, causes: string[] = []): string[] => {
  const updated = [...causes];

  if (obj.caused_by) {
    if (obj.caused_by?.reason) {
      updated.push(obj.caused_by?.reason);
    }

    // Recursively find all the "caused by" reasons
    return getEsCause(obj.caused_by, updated);
  }

  if (obj.failed_shards && obj.failed_shards.length) {
    for (const failure of obj.failed_shards) {
      if (failure && failure.reason) {
        updated.push(...getEsCause(failure.reason));
      }
    }
  }

  return updated.filter(Boolean);
};

export const getEsErrorMessage = (error: Error) => {
  let message = error.message;
  const apiError =
    (error as ElasticsearchError)?.error?.meta?.body?.error ??
    (error as ElasticsearchError)?.meta?.body?.error;
  if (apiError) {
    message += `, caused by: "${getEsCause(apiError as ErrorObject)}"`;
  }
  return message;
};

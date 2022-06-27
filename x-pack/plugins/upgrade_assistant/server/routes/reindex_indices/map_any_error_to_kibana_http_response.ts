/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';

import {
  AccessForbidden,
  CannotCreateIndex,
  IndexNotFound,
  MultipleReindexJobsFound,
  ReindexAlreadyInProgress,
  ReindexCannotBeCancelled,
  ReindexTaskCannotBeDeleted,
  ReindexTaskFailed,
} from '../../lib/reindexing/error_symbols';
import { ReindexError } from '../../lib/reindexing/error';

export const mapAnyErrorToKibanaHttpResponse = (e: any) => {
  if (e instanceof ReindexError) {
    switch (e.symbol) {
      case AccessForbidden:
        return kibanaResponseFactory.forbidden({ body: e.message });
      case IndexNotFound:
        return kibanaResponseFactory.notFound({ body: e.message });
      case CannotCreateIndex:
      case ReindexTaskCannotBeDeleted:
        throw e;
      case ReindexTaskFailed:
        // Bad data
        return kibanaResponseFactory.customError({ body: e.message, statusCode: 422 });
      case ReindexAlreadyInProgress:
      case MultipleReindexJobsFound:
      case ReindexCannotBeCancelled:
        return kibanaResponseFactory.badRequest({ body: e.message });
      default:
      // nothing matched
    }
  }

  throw e;
};

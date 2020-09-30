/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { i18n } from '@kbn/i18n';

import { ResponseError, CustomHttpResponseOptions } from 'src/core/server';

import { CommonResponseStatusSchema, TransformIdsSchema } from '../../../common/api_schemas/common';
import { DeleteTransformsResponseSchema } from '../../../common/api_schemas/delete_transforms';

const REQUEST_TIMEOUT = 'RequestTimeout';

export function isRequestTimeout(error: any) {
  return error.displayName === REQUEST_TIMEOUT;
}

interface Params {
  results: CommonResponseStatusSchema | DeleteTransformsResponseSchema;
  id: string;
  items: TransformIdsSchema;
  action: string;
}

// populate a results object with timeout errors for the ids which haven't already been set
export function fillResultsWithTimeouts({ results, id, items, action }: Params) {
  const extra =
    items.length - Object.keys(results).length > 1
      ? i18n.translate(
          'xpack.transform.models.transformService.allOtherRequestsCancelledDescription',
          {
            defaultMessage: 'All other requests cancelled.',
          }
        )
      : '';

  const error = {
    response: {
      error: {
        root_cause: [
          {
            reason: i18n.translate(
              'xpack.transform.models.transformService.requestToActionTimedOutErrorMessage',
              {
                defaultMessage: `Request to {action} '{id}' timed out. {extra}`,
                values: {
                  id,
                  action,
                  extra,
                },
              }
            ),
          },
        ],
      },
    },
  };

  const newResults: CommonResponseStatusSchema | DeleteTransformsResponseSchema = {};

  return items.reduce((accumResults, currentVal) => {
    if (results[currentVal.id] === undefined) {
      accumResults[currentVal.id] = {
        success: false,
        error,
      };
    } else {
      accumResults[currentVal.id] = results[currentVal.id];
    }
    return accumResults;
  }, newResults);
}

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = Boom.isBoom(error) ? error : Boom.boomify(error, { statusCode: error.status });
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
}

function extractCausedByChain(
  causedBy: Record<string, any> = {},
  accumulator: string[] = []
): string[] {
  const { reason, caused_by } = causedBy; // eslint-disable-line @typescript-eslint/naming-convention

  if (reason) {
    accumulator.push(reason);
  }

  if (caused_by) {
    return extractCausedByChain(caused_by, accumulator);
  }

  return accumulator;
}

/**
 * Wraps an error thrown by the ES JS client into a Boom error response and returns it
 *
 * @param err Object Error thrown by ES JS client
 * @param statusCodeToMessageMap Object Optional map of HTTP status codes => error messages
 * @return Object Boom error response
 */
export function wrapEsError(err: any, statusCodeToMessageMap: Record<string, any> = {}) {
  const { statusCode, response } = err;

  const {
    error: {
      root_cause = [], // eslint-disable-line @typescript-eslint/naming-convention
      caused_by = {}, // eslint-disable-line @typescript-eslint/naming-convention
    } = {},
  } = JSON.parse(response);

  // If no custom message if specified for the error's status code, just
  // wrap the error as a Boom error response, include the additional information from ES, and return it
  if (!statusCodeToMessageMap[statusCode]) {
    const boomError = Boom.boomify(err, { statusCode });

    // The caused_by chain has the most information so use that if it's available. If not then
    // settle for the root_cause.
    const causedByChain = extractCausedByChain(caused_by);
    const defaultCause = root_cause.length ? extractCausedByChain(root_cause[0]) : undefined;

    // @ts-expect-error cause is not defined on payload type
    boomError.output.payload.cause = causedByChain.length ? causedByChain : defaultCause;
    return boomError;
  }

  // Otherwise, use the custom message to create a Boom error response and
  // return it
  const message = statusCodeToMessageMap[statusCode];
  return new Boom(message, { statusCode });
}

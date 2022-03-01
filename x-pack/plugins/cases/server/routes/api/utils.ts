/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom, boomify, isBoom } from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { CustomHttpResponseOptions, ResponseError, Headers, Logger } from 'kibana/server';
import { CaseError, isCaseError, HTTPError, isHTTPError } from '../../common/error';

/**
 * Transforms an error into the correct format for a kibana response.
 */

export function wrapError(
  error: CaseError | Boom | HTTPError | Error
): CustomHttpResponseOptions<ResponseError> {
  let boom: Boom;

  if (isCaseError(error)) {
    boom = error.boomify();
  } else {
    const options = { statusCode: isHTTPError(error) ? error.statusCode : 500 };
    boom = isBoom(error) ? error : boomify(error, options);
  }

  return {
    body: boom,
    headers: boom.output.headers as { [key: string]: string },
    statusCode: boom.output.statusCode,
  };
}

export const escapeHatch = schema.object({}, { unknowns: 'allow' });

/**
 * Creates a warning header with a message formatted according to RFC7234.
 * We follow the same formatting as Elasticsearch
 * https://github.com/elastic/elasticsearch/blob/5baabff6670a8ed49297488ca8cac8ec12a2078d/server/src/main/java/org/elasticsearch/common/logging/HeaderWarning.java#L55
 */
export const getWarningHeader = (
  kibanaVersion: string,
  msg: string | undefined = 'Deprecated endpoint'
): { warning: string } => ({
  warning: `299 Kibana-${kibanaVersion} "${msg}"`,
});

/**
 * Taken from
 * https://github.com/elastic/kibana/blob/ec30f2aeeb10fb64b507935e558832d3ef5abfaa/x-pack/plugins/spaces/server/usage_stats/usage_stats_client.ts#L113-L118
 */

export const getIsKibanaRequest = (headers?: Headers): boolean => {
  // The presence of these two request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  return !!(headers && headers['kbn-version'] && headers.referer);
};

export const logDeprecatedEndpoint = (logger: Logger, headers: Headers, msg: string) => {
  if (!getIsKibanaRequest(headers)) {
    logger.warn(msg);
  }
};

/**
 * Extracts the warning value a warning header that is formatted according to RFC 7234.
 * For example for the string 299 Kibana-8.1.0 "Deprecation endpoint", the return value is Deprecation endpoint.
 *
 */
export const extractWarningValueFromWarningHeader = (warningHeader: string) => {
  const firstQuote = warningHeader.indexOf('"');
  const lastQuote = warningHeader.length - 1;
  const warningValue = warningHeader.substring(firstQuote + 1, lastQuote);
  return warningValue;
};

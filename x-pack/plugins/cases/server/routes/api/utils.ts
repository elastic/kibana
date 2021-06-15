/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom, boomify, isBoom } from '@hapi/boom';

import { schema } from '@kbn/config-schema';
import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';
import { isCaseError } from '../../common/error';

/**
 * Transforms an error into the correct format for a kibana response.
 */
export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  let boom: Boom;

  if (isCaseError(error)) {
    boom = error.boomify();
  } else {
    const options = { statusCode: error.statusCode ?? 500 };
    boom = isBoom(error) ? error : boomify(error, options);
  }

  return {
    body: boom,
    headers: boom.output.headers as { [key: string]: string },
    statusCode: boom.output.statusCode,
  };
}

export const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const getCaseUrl = (url: string | string[] | undefined, caseId: string): string | null => {
  const caseUrl = Array.isArray(url) ? url[0] : url;
  if (caseUrl != null) {
    // split at case id to get cases base url. if we split at ? we might get the comment or whatever else included in the url
    let possibleCaseUrl;
    let appName;
    if (caseUrl.includes('app/security')) {
      appName = 'app/security';
      possibleCaseUrl = caseUrl.split(`/${appName}`)[0];
    } else if (caseUrl.includes('app/observability')) {
      appName = 'app/observability';
      possibleCaseUrl = caseUrl.split(`/${appName}`)[0];
    }
    if (appName != null) {
      return `${possibleCaseUrl}/${appName}/cases/${caseId}`;
    }
  }
  return null;
};

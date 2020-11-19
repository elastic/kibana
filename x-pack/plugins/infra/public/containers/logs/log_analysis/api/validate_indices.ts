/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpHandler } from 'src/core/public';

import {
  LOG_ANALYSIS_VALIDATE_INDICES_PATH,
  ValidationIndicesFieldSpecification,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
} from '../../../../../common/http_api';

import { decodeOrThrow } from '../../../../../common/runtime_types';

interface RequestArgs {
  indices: string[];
  fields: ValidationIndicesFieldSpecification[];
}

export const callValidateIndicesAPI = async (requestArgs: RequestArgs, fetch: HttpHandler) => {
  const { indices, fields } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
    method: 'POST',
    body: JSON.stringify(validationIndicesRequestPayloadRT.encode({ data: { indices, fields } })),
  });

  return decodeOrThrow(validationIndicesResponsePayloadRT)(response);
};

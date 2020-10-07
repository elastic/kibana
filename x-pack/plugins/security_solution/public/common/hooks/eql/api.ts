/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from '../../../../../../../src/core/public';
import { DETECTION_ENGINE_EQL_VALIDATION_URL } from '../../../../common/constants';
import { EqlValidationSchema as EqlValidationRequest } from '../../../../common/detection_engine/schemas/request/eql_validation_schema';
import { EqlValidationSchema as EqlValidationResponse } from '../../../../common/detection_engine/schemas/response/eql_validation_schema';

interface ApiParams {
  http: HttpStart;
  signal: AbortSignal;
}

export const validateEql = async ({
  http,
  query,
  index,
  signal,
}: ApiParams & EqlValidationRequest) => {
  return http.fetch<EqlValidationResponse>(DETECTION_ENGINE_EQL_VALIDATION_URL, {
    method: 'POST',
    body: JSON.stringify({
      query,
      index,
    }),
    signal,
  });
};

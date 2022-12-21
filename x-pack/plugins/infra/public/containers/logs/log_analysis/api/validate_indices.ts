/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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
  runtimeMappings: estypes.MappingRuntimeFields;
}

export const callValidateIndicesAPI = async (requestArgs: RequestArgs, fetch: HttpHandler) => {
  const { indices, fields, runtimeMappings } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      validationIndicesRequestPayloadRT.encode({ data: { indices, fields, runtimeMappings } })
    ),
  });

  return decodeOrThrow(validationIndicesResponsePayloadRT)(response);
};

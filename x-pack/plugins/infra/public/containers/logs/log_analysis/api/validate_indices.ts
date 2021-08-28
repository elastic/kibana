/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import type { HttpHandler } from '../../../../../../../../src/core/public/http/types';
import type { ValidationIndicesFieldSpecification } from '../../../../../common/http_api/log_analysis/validation/log_entry_rate_indices';
import {
  LOG_ANALYSIS_VALIDATE_INDICES_PATH,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
} from '../../../../../common/http_api/log_analysis/validation/log_entry_rate_indices';
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

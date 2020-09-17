/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpSetup } from 'src/core/public';
import {
  LOG_ANALYSIS_VALIDATE_DATASETS_PATH,
  validateLogEntryDatasetsRequestPayloadRT,
  validateLogEntryDatasetsResponsePayloadRT,
} from '../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../common/runtime_types';

interface RequestArgs {
  indices: string[];
  timestampField: string;
  startTime: number;
  endTime: number;
}

export const callValidateDatasetsAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpSetup['fetch']
) => {
  const { indices, timestampField, startTime, endTime } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_VALIDATE_DATASETS_PATH, {
    method: 'POST',
    body: JSON.stringify(
      validateLogEntryDatasetsRequestPayloadRT.encode({
        data: {
          endTime,
          indices,
          startTime,
          timestampField,
        },
      })
    ),
  });

  return decodeOrThrow(validateLogEntryDatasetsResponsePayloadRT)(response);
};

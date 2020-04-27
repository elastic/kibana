/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LOG_ANALYSIS_VALIDATE_DATASETS_PATH,
  validateLogEntryDatasetsRequestPayloadRT,
  validateLogEntryDatasetsResponsePayloadRT,
} from '../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { npStart } from '../../../../legacy_singletons';

export const callValidateDatasetsAPI = async (
  sourceId: string,
  indices: string[],
  startTime: number,
  endTime: number
) => {
  const response = await npStart.http.fetch(LOG_ANALYSIS_VALIDATE_DATASETS_PATH, {
    method: 'POST',
    body: JSON.stringify(
      validateLogEntryDatasetsRequestPayloadRT.encode({
        data: {
          endTime,
          indices,
          sourceId,
          startTime,
        },
      })
    ),
  });

  return decodeOrThrow(validateLogEntryDatasetsResponsePayloadRT)(response);
};

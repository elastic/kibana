/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpClient } from 'src/core/public';
import {
  getLogSourceConfigurationPath,
  patchLogSourceConfigurationSuccessResponsePayloadRT,
  patchLogSourceConfigurationRequestBodyRT,
  LogSourceConfigurationPropertiesPatch,
} from '../../../../../common/http_api/log_sources';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export const callPatchLogSourceConfigurationAPI = async (
  sourceId: string,
  patchedProperties: LogSourceConfigurationPropertiesPatch,
  fetch: HttpClient['fetch']
) => {
  const response = await fetch(getLogSourceConfigurationPath(sourceId), {
    method: 'PATCH',
    body: JSON.stringify(
      patchLogSourceConfigurationRequestBodyRT.encode({
        data: patchedProperties,
      })
    ),
  });

  return decodeOrThrow(patchLogSourceConfigurationSuccessResponsePayloadRT)(response);
};

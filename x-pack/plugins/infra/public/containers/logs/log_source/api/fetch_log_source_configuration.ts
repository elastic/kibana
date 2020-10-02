/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpHandler } from 'src/core/public';
import {
  getLogSourceConfigurationPath,
  getLogSourceConfigurationSuccessResponsePayloadRT,
} from '../../../../../common/http_api/log_sources';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export const callFetchLogSourceConfigurationAPI = async (sourceId: string, fetch: HttpHandler) => {
  const response = await fetch(getLogSourceConfigurationPath(sourceId), {
    method: 'GET',
  });

  return decodeOrThrow(getLogSourceConfigurationSuccessResponsePayloadRT)(response);
};

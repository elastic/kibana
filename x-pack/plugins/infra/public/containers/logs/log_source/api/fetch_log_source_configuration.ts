/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getLogSourceConfigurationPath,
  getLogSourceConfigurationSuccessResponsePayloadRT,
} from '../../../../../common/http_api/log_sources';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { npStart } from '../../../../legacy_singletons';

export const callFetchLogSourceConfigurationAPI = async (sourceId: string) => {
  const response = await npStart.http.fetch(getLogSourceConfigurationPath(sourceId), {
    method: 'GET',
  });

  return decodeOrThrow(getLogSourceConfigurationSuccessResponsePayloadRT)(response);
};

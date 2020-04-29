/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getLogSourceStatusPath,
  getLogSourceStatusSuccessResponsePayloadRT,
} from '../../../../../common/http_api/log_sources';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { npStart } from '../../../../legacy_singletons';

export const callFetchLogSourceStatusAPI = async (sourceId: string) => {
  const response = await npStart.http.fetch(getLogSourceStatusPath(sourceId), {
    method: 'GET',
  });

  return decodeOrThrow(getLogSourceStatusSuccessResponsePayloadRT)(response);
};

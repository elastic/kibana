/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core/public';
import { decodeOrThrow } from '../../../../common/runtime_types';
import {
  getLogAnalysisIdFormatsRequestPayloadRT,
  getLogAnalysisIdFormatsSuccessResponsePayloadRT,
  LOG_ANALYSIS_GET_ID_FORMATS,
} from '../../../../common/http_api/latest';

interface RequestArgs {
  spaceId: string;
  logViewId: string;
}

export const callGetLogAnalysisIdFormats = async (requestArgs: RequestArgs, fetch: HttpHandler) => {
  const { logViewId, spaceId } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_GET_ID_FORMATS, {
    method: 'POST',
    body: JSON.stringify(
      getLogAnalysisIdFormatsRequestPayloadRT.encode({
        data: {
          logViewId,
          spaceId,
        },
      })
    ),
    version: '1',
  });

  return decodeOrThrow(getLogAnalysisIdFormatsSuccessResponsePayloadRT)(response);
};

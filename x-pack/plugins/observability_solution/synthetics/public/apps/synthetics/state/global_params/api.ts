/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INITIAL_REST_VERSION, SYNTHETICS_API_URLS } from '../../../../../common/constants';
import {
  DeleteParamsResponse,
  SyntheticsParamRequest,
  SyntheticsParams,
  SyntheticsParamsCodec,
  SyntheticsParamsReadonlyCodec,
} from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service/api_service';

export const getGlobalParams = async (): Promise<SyntheticsParams[]> => {
  return apiService.get<SyntheticsParams[]>(
    SYNTHETICS_API_URLS.PARAMS,
    { version: INITIAL_REST_VERSION },
    SyntheticsParamsReadonlyCodec
  );
};

export const addGlobalParam = async (
  paramRequest: SyntheticsParamRequest
): Promise<SyntheticsParams> =>
  apiService.post(SYNTHETICS_API_URLS.PARAMS, paramRequest, SyntheticsParamsCodec, {
    version: INITIAL_REST_VERSION,
  });

export const editGlobalParam = async ({
  paramRequest,
  id,
}: {
  id: string;
  paramRequest: SyntheticsParamRequest;
}): Promise<SyntheticsParams> =>
  apiService.put<SyntheticsParams>(
    SYNTHETICS_API_URLS.PARAMS + `/${id}`,
    paramRequest,
    SyntheticsParamsCodec,
    {
      version: INITIAL_REST_VERSION,
    }
  );

export const deleteGlobalParams = async (ids: string[]): Promise<DeleteParamsResponse[]> =>
  apiService.delete(
    SYNTHETICS_API_URLS.PARAMS,
    { version: INITIAL_REST_VERSION },
    {
      ids,
    }
  );

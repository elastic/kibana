/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-common';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { SyntheticsParamRequest, SyntheticsParamSO } from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service/api_service';

export const getGlobalParams = async (): Promise<Array<SavedObject<SyntheticsParamSO>>> => {
  const result = (await apiService.get(SYNTHETICS_API_URLS.PARAMS)) as {
    data: Array<SavedObject<SyntheticsParamSO>>;
  };
  return result.data;
};

export const addGlobalParam = async (
  paramRequest: SyntheticsParamRequest
): Promise<SyntheticsParamSO> => {
  return apiService.post(SYNTHETICS_API_URLS.PARAMS, paramRequest);
};

export const editGlobalParam = async ({
  paramRequest,
  id,
}: {
  id: string;
  paramRequest: SyntheticsParamRequest;
}): Promise<SyntheticsParamSO> => {
  return apiService.put(SYNTHETICS_API_URLS.PARAMS, {
    id,
    ...paramRequest,
  });
};

export const deleteGlobalParams = async ({
  ids,
}: {
  ids: string[];
}): Promise<SyntheticsParamSO> => {
  return apiService.delete(SYNTHETICS_API_URLS.PARAMS, {
    ids: JSON.stringify(ids),
  });
};

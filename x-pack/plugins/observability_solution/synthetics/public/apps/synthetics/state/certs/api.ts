/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { CertResult, GetCertsParams } from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service/api_service';

export const getCertsList = async (queryParams: GetCertsParams): Promise<CertResult> => {
  const { pageIndex, size, search, sortBy, direction } = queryParams;
  const result = (await apiService.get(SYNTHETICS_API_URLS.CERTS, {
    pageIndex,
    size,
    search,
    sortBy,
    direction,
  })) as {
    data: CertResult;
  };
  return result.data;
};

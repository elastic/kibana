/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_URLS } from '../../../common/constants';
import { apiService } from './utils';
import { CertResultType, GetCertsParams } from '../../../common/runtime_types';

export const fetchCertificates = async (params: GetCertsParams) => {
  return await apiService.get(API_URLS.CERTS, params, CertResultType);
};

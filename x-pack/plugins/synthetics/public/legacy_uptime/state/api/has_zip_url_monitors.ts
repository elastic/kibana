/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../../common/constants';
import { SyntheticsHasZipUrlMonitorsResponse } from '../../../../common/types/zip_url_deprecation';
import { apiService } from './utils';

export const getHasZipUrlMonitors = async (): Promise<SyntheticsHasZipUrlMonitorsResponse> => {
  return await apiService.get(API_URLS.SYNTHETICS_HAS_ZIP_URL_MONITORS);
};

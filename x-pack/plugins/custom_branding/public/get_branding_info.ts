/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { CustomBrandingInfoResponse } from '../common';

export const getCustomBrandingInfo = async (
  http: HttpStart
): Promise<CustomBrandingInfoResponse> => {
  return await http.get<CustomBrandingInfoResponse>('/api/custom-branding/info');
};

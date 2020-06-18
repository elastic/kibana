/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlCapabilitiesResponse } from '../../../../../../ml/public';
import { KibanaServices } from '../../../lib/kibana';
import { InfluencerInput } from '../types';

export interface Body {
  jobIds: string[];
  criteriaFields: string[];
  influencers: InfluencerInput[];
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
}

export const getMlCapabilities = async (signal: AbortSignal): Promise<MlCapabilitiesResponse> => {
  return KibanaServices.get().http.fetch<MlCapabilitiesResponse>('/api/ml/ml_capabilities', {
    method: 'GET',
    asSystemRequest: true,
    signal,
  });
};

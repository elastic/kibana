/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { MlCapabilitiesResponse } from '@kbn/ml-plugin/public';
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

export const getMlCapabilities = async ({
  http,
  signal,
}: {
  http: HttpSetup;
  signal: AbortSignal;
}): Promise<MlCapabilitiesResponse> =>
  http.fetch<MlCapabilitiesResponse>('/api/ml/ml_capabilities', {
    method: 'GET',
    asSystemRequest: true,
    signal,
  });

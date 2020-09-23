/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiService } from './utils';
import { FetchJourneyStepsParams, FetchStepScreenshot } from '../actions/journey';
import {
  SyntheticsJourneyApiResponse,
  SyntheticsJourneyApiResponseType,
} from '../../../common/runtime_types';

export async function fetchJourneySteps(
  params: FetchJourneyStepsParams
): Promise<SyntheticsJourneyApiResponse> {
  return (await apiService.get(
    `/api/uptime/journey/${params.checkGroup}`,
    undefined,
    SyntheticsJourneyApiResponseType
  )) as SyntheticsJourneyApiResponse;
}

export async function fetchStepScreenshot({ checkGroup, stepIndex }: FetchStepScreenshot) {
  return await apiService.get(
    `http://localhost:5601/api/uptime/journey/screenshot/${checkGroup}/${stepIndex}`
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiService } from '../../../../utils/api_service';
import {
  FailedStepsApiResponse,
  FailedStepsApiResponseType,
  ScreenshotBlockDoc,
  ScreenshotImageBlob,
  ScreenshotRefImageData,
  SyntheticsJourneyApiResponse,
  SyntheticsJourneyApiResponseType,
  Ping,
  PingType,
} from '../../../../../common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../../../common/constants';

export interface FetchJourneyStepsParams {
  checkGroup: string;
  syntheticEventTypes?: string[];
}

export async function fetchScreenshotBlockSet(params: string[]): Promise<ScreenshotBlockDoc[]> {
  return apiService.post<ScreenshotBlockDoc[]>(API_URLS.JOURNEY_SCREENSHOT_BLOCKS, {
    hashes: params,
  });
}

export async function fetchBrowserJourney(
  params: FetchJourneyStepsParams
): Promise<SyntheticsJourneyApiResponse> {
  return apiService.get(
    SYNTHETICS_API_URLS.JOURNEY.replace('{checkGroup}', params.checkGroup),
    { syntheticEventTypes: params.syntheticEventTypes },
    SyntheticsJourneyApiResponseType
  );
}

export async function fetchJourneysFailedSteps({
  checkGroups,
}: {
  checkGroups: string[];
}): Promise<FailedStepsApiResponse> {
  return apiService.get(API_URLS.JOURNEY_FAILED_STEPS, { checkGroups }, FailedStepsApiResponseType);
}

export async function fetchLastSuccessfulCheck({
  monitorId,
  timestamp,
  stepIndex,
  location,
}: {
  monitorId: string;
  timestamp: string;
  stepIndex: number;
  location?: string;
}): Promise<Ping> {
  return await apiService.get(
    API_URLS.SYNTHETICS_SUCCESSFUL_CHECK,
    {
      monitorId,
      timestamp,
      stepIndex,
      location,
    },
    PingType
  );
}

export async function getJourneyScreenshot(
  imgSrc: string
): Promise<ScreenshotImageBlob | ScreenshotRefImageData | null> {
  try {
    const imgRequest = new Request(imgSrc);

    const response = await fetch(imgRequest);

    if (response.status !== 200) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    const stepName = response.headers.get('caption-name');
    const maxSteps = Number(response.headers.get('max-steps') ?? 0);
    if (contentType?.indexOf('application/json') !== -1) {
      return {
        stepName,
        maxSteps,
        ref: await response.json(),
      };
    } else {
      return {
        stepName,
        maxSteps,
        src: URL.createObjectURL(await response.blob()),
      };
    }
  } catch (e) {
    return null;
  }
}

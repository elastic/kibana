/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiService } from './utils';
import { FetchJourneyStepsParams } from '../actions/journey';
import { Ping, PingType } from '../../../common/runtime_types/ping/ping';
import {
  FailedStepsApiResponse,
  FailedStepsApiResponseType,
  ScreenshotBlockDoc,
  ScreenshotImageBlob,
  ScreenshotRefImageData,
  SyntheticsJourneyApiResponse,
  SyntheticsJourneyApiResponseType,
} from '../../../common/runtime_types/ping/synthetics';
import { API_URLS } from '../../../common/constants';

export async function fetchScreenshotBlockSet(params: string[]): Promise<ScreenshotBlockDoc[]> {
  return apiService.post<ScreenshotBlockDoc[]>(API_URLS.JOURNEY_SCREENSHOT_BLOCKS, {
    hashes: params,
  });
}

export async function fetchJourneySteps(
  params: FetchJourneyStepsParams
): Promise<SyntheticsJourneyApiResponse> {
  return apiService.get(
    `/internal/uptime/journey/${params.checkGroup}`,
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

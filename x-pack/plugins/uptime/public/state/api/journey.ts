/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiService } from './utils';
import { FetchJourneyStepsParams } from '../actions/journey';
import {
  FailedStepsApiResponse,
  FailedStepsApiResponseType,
  Ping,
  ScreenshotRefImageData,
  SyntheticsJourneyApiResponse,
  SyntheticsJourneyApiResponseType,
} from '../../../common/runtime_types';

export async function fetchJourneySteps(
  params: FetchJourneyStepsParams
): Promise<SyntheticsJourneyApiResponse> {
  return (await apiService.get(
    `/api/uptime/journey/${params.checkGroup}`,
    { syntheticEventTypes: params.syntheticEventTypes },
    SyntheticsJourneyApiResponseType
  )) as SyntheticsJourneyApiResponse;
}

export async function fetchJourneysFailedSteps({
  checkGroups,
}: {
  checkGroups: string[];
}): Promise<FailedStepsApiResponse> {
  return await apiService.get(
    `/api/uptime/journeys/failed_steps`,
    { checkGroups },
    FailedStepsApiResponseType
  );
}

export async function fetchLastSuccessfulStep({
  monitorId,
  timestamp,
  stepIndex,
}: {
  monitorId: string;
  timestamp: string;
  stepIndex: number;
}): Promise<Ping> {
  return (await apiService.get(`/api/uptime/synthetics/step/success/`, {
    monitorId,
    timestamp,
    stepIndex,
  })) as Ping;
}

export interface ScreenshotImageBlob {
  stepName: string | null;
  maxSteps: number;
  src: string;
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
      const imgBlob = await response.blob();
      return {
        stepName,
        maxSteps,
        src: URL.createObjectURL(imgBlob),
      };
    }
  } catch (e) {
    return null;
  }
}

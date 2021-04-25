/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiService } from './utils';
import { FetchJourneyStepsParams } from '../actions/journey';
import {
  Ping,
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
}): Promise<SyntheticsJourneyApiResponse> {
  return (await apiService.get(
    `/api/uptime/journeys/failed_steps`,
    { checkGroups },
    SyntheticsJourneyApiResponseType
  )) as SyntheticsJourneyApiResponse;
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

export async function getJourneyScreenshot(imgSrc: string) {
  try {
    const imgRequest = new Request(imgSrc);

    const response = await fetch(imgRequest);

    if (response.status !== 200) {
      return null;
    }

    const imgBlob = await response.blob();

    const stepName = response.headers.get('caption-name');
    const maxSteps = response.headers.get('max-steps');

    return {
      stepName,
      maxSteps: Number(maxSteps ?? 0),
      src: URL.createObjectURL(imgBlob),
    };
  } catch (e) {
    return null;
  }
}

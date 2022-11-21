/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';
import { StepMetrics, useStepMetrics } from './use_step_metrics';

export const MONITOR_DURATION_US = 'monitor.duration.us';
export const SYNTHETICS_CLS = 'browser.experience.cls';
export const SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const SYNTHETICS_DOCUMENT_ONLOAD = 'browser.experience.load.us';
export const SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const SYNTHETICS_STEP_NAME = 'synthetics.step.name.keyword';
export const SYNTHETICS_STEP_DURATION = 'synthetics.step.duration.us';

export const useStepPrevMetrics = (stepMetrics: StepMetrics) => {
  const { checkGroupId } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { data } = useJourneySteps(checkGroupId);

  const prevCheckGroupId = data?.details?.previous?.checkGroup;

  const prevMetrics = useStepMetrics(Boolean(prevCheckGroupId), prevCheckGroupId);

  const fcpThreshold = findThreshold(stepMetrics?.fcp?.value, prevMetrics?.fcp?.value);
  const lcpThreshold = findThreshold(stepMetrics?.lcp?.value, prevMetrics?.lcp?.value);
  const clsThreshold = findThreshold(stepMetrics?.cls?.value, prevMetrics?.cls?.value);
  const dclThreshold = findThreshold(stepMetrics?.dcl?.value, prevMetrics?.dcl?.value);
  const totalThreshold = findThreshold(
    stepMetrics?.totalDuration?.value,
    prevMetrics?.totalDuration?.value
  );

  return {
    fcpThreshold,
    lcpThreshold,
    clsThreshold,
    dclThreshold,
    totalThreshold,
  };
};

const findThreshold = (current?: number | null, prev?: number | null) => {
  return -1 * (100 - ((current ?? 0) / (prev ?? 0)) * 100);
};

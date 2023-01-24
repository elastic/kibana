/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useJourneySteps } from '../../monitor_details/hooks/use_journey_steps';

export const useStepDetailPage = () => {
  const {
    checkGroupId,
    monitorId,
    stepIndex: stepIndexString,
  } = useParams<{
    checkGroupId: string;
    stepIndex: string;
    monitorId: string;
  }>();

  const stepIndex = Number(stepIndexString);

  const { data: journey, stepEnds } = useJourneySteps(checkGroupId);

  const memoized = useMemo(
    () => ({
      activeStep: journey?.steps?.find((step) => step.synthetics?.step?.index === stepIndex),
    }),
    [journey, stepIndex]
  );

  const { basePath } = useSyntheticsSettingsContext();

  const handleStepHref = (stepNo: number) =>
    `${basePath}/app/synthetics/monitor/${monitorId}/test-run/${checkGroupId}/step/${stepNo}`;

  return {
    checkGroupId,
    journey,
    stepIndex,
    stepEnds,
    ...memoized,
    handleStepHref,
  };
};

export const useStepDetailLink = ({
  checkGroupId,
  stepIndex,
}: {
  checkGroupId?: string;
  stepIndex: string;
}) => {
  const { basePath } = useSyntheticsSettingsContext();

  const { monitorId } = useParams<{
    monitorId: string;
  }>();

  if (!checkGroupId) {
    return '';
  }

  return `${basePath}/app/synthetics/monitor/${monitorId}/test-run/${checkGroupId}/step/${stepIndex}`;
};

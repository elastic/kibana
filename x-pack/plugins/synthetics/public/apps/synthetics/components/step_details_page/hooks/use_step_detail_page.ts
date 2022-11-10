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
import { JourneyStep, SyntheticsJourneyApiResponse } from '../../../../../../common/runtime_types';

export const useStepDetailPage = (): {
  activeStep?: JourneyStep;
  checkGroupId: string;
  handleNextStepHref: string;
  handlePreviousStepHref: string;
  handleNextRunHref: string;
  handlePreviousRunHref: string;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
  journey?: SyntheticsJourneyApiResponse;
  stepIndex: number;
} => {
  const { checkGroupId, stepIndex: stepIndexString } = useParams<{
    checkGroupId: string;
    stepIndex: string;
  }>();

  const stepIndex = Number(stepIndexString);

  const { data: journey } = useJourneySteps(checkGroupId);

  const memoized = useMemo(
    () => ({
      hasPreviousStep: stepIndex > 1 ? true : false,
      activeStep: journey?.steps?.find((step) => step.synthetics?.step?.index === stepIndex),
      hasNextStep: journey && journey.steps && stepIndex < journey.steps.length ? true : false,
    }),
    [journey, stepIndex]
  );

  const { basePath } = useSyntheticsSettingsContext();

  const handleNextStepHref = `${basePath}/app/synthetics/journey/${checkGroupId}/step/${
    stepIndex + 1
  }`;

  const handlePreviousStepHref = `${basePath}/app/synthetics/journey/${checkGroupId}/step/${
    stepIndex - 1
  }`;

  const handleNextRunHref = `${basePath}/app/synthetics/journey/${journey?.details?.next?.checkGroup}/step/1`;

  const handlePreviousRunHref = `${basePath}/app/synthetics/journey/${journey?.details?.previous?.checkGroup}/step/1`;

  return {
    checkGroupId,
    journey,
    stepIndex,
    ...memoized,
    handleNextStepHref,
    handlePreviousStepHref,
    handleNextRunHref,
    handlePreviousRunHref,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { isStepEnd } from '../../common/monitor_test_result/browser_steps_list';
import { JourneyStep, SyntheticsJourneyApiResponse } from '../../../../../../common/runtime_types';
import {
  fetchJourneyAction,
  selectBrowserJourney,
  selectBrowserJourneyLoading,
} from '../../../state';

export const useJourneySteps = (checkGroup?: string, lastRefresh?: number) => {
  const { stepIndex, checkGroupId: urlCheckGroup } = useParams<{
    stepIndex: string;
    checkGroupId: string;
  }>();
  const checkGroupId = checkGroup ?? urlCheckGroup;

  const journeyData = useSelector(selectBrowserJourney(checkGroupId));
  const loading = useSelector(selectBrowserJourneyLoading(checkGroupId));

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchJourneyAction.get({ checkGroup: checkGroupId }));
  }, [checkGroupId, dispatch, lastRefresh]);

  const isFailed =
    journeyData?.steps.some(
      (step) =>
        step.synthetics?.step?.status === 'failed' || step.synthetics?.step?.status === 'skipped'
    ) ?? false;

  const stepEnds: JourneyStep[] = (journeyData?.steps ?? []).filter(isStepEnd);
  const failedStep = journeyData?.steps.find((step) => step.synthetics?.step?.status === 'failed');
  const stepLabels = stepEnds.map((stepEnd) => stepEnd?.synthetics?.step?.name ?? '');

  const currentStep = stepIndex
    ? journeyData?.steps.find((step) => step.synthetics?.step?.index === Number(stepIndex))
    : undefined;

  return {
    data: journeyData as SyntheticsJourneyApiResponse,
    loading: loading ?? false,
    isFailed,
    stepEnds,
    stepLabels,
    currentStep,
    failedStep,
  };
};

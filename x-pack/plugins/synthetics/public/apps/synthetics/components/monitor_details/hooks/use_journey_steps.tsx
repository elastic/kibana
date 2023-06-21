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
import { JourneyStep } from '../../../../../../common/runtime_types';
import {
  fetchJourneyAction,
  selectBrowserJourney,
  selectBrowserJourneyLoading,
} from '../../../state';

export const useJourneySteps = (
  checkGroup?: string,
  lastRefresh?: number,
  stepIndexArg?: number
) => {
  const { stepIndex: stepIndexUrl, checkGroupId: urlCheckGroup } = useParams<{
    stepIndex: string;
    checkGroupId: string;
  }>();

  const stepIndex = stepIndexArg ?? stepIndexUrl;

  const checkGroupId = checkGroup ?? urlCheckGroup;

  const journeyData = useSelector(selectBrowserJourney(checkGroupId));
  const loading = useSelector(selectBrowserJourneyLoading(checkGroupId));

  const dispatch = useDispatch();

  useEffect(() => {
    if (checkGroupId) {
      dispatch(fetchJourneyAction.get({ checkGroup: checkGroupId }));
    }
  }, [checkGroupId, dispatch, lastRefresh]);

  const stepEnds: JourneyStep[] = (journeyData?.steps ?? []).filter(isStepEnd);
  const failedStep = journeyData?.steps.find((step) => step.synthetics?.step?.status === 'failed');
  const stepLabels = stepEnds.map((stepEnd) => stepEnd?.synthetics?.step?.name ?? '');

  const currentStep = stepIndex
    ? stepEnds.find((step) => step.synthetics?.step?.index === Number(stepIndex))
    : undefined;

  const isFailedStep =
    failedStep?.synthetics?.step && failedStep.synthetics.step.index === Number(stepIndex);

  return {
    data: journeyData,
    loading: loading ?? false,
    stepEnds,
    stepLabels,
    currentStep,
    failedStep,
    isFailedStep,
    isFailed: false,
  };
};

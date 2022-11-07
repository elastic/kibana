/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { isStepEnd } from '../../common/monitor_test_result/browser_steps_list';
import { JourneyStep, SyntheticsJourneyApiResponse } from '../../../../../../common/runtime_types';
import { fetchJourneySteps } from '../../../state';

export const useJourneySteps = (checkGroup: string | undefined) => {
  const { stepIndex } = useParams<{ stepIndex: string }>();

  const { data, loading } = useFetcher(() => {
    if (!checkGroup) {
      return Promise.resolve(null);
    }

    return fetchJourneySteps({ checkGroup });
  }, [checkGroup]);

  const isFailed =
    data?.steps.some(
      (step) =>
        step.synthetics?.step?.status === 'failed' || step.synthetics?.step?.status === 'skipped'
    ) ?? false;

  const stepEnds: JourneyStep[] = (data?.steps ?? []).filter(isStepEnd);

  const stepLabels = stepEnds.map((stepEnd) => stepEnd?.synthetics?.step?.name ?? '');

  return {
    data: data as SyntheticsJourneyApiResponse,
    loading: loading ?? false,
    isFailed,
    stepEnds,
    stepLabels,
    currentStep: stepIndex
      ? data?.steps.find((step) => step.synthetics?.step?.index === Number(stepIndex))
      : undefined,
  };
};

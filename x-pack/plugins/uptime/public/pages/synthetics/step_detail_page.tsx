/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useInitApp } from '../../hooks/use_init_app';
import { StepDetailContainer } from '../../components/monitor/synthetics/step_detail/step_detail_container';
import { journeySelector } from '../../state/selectors';
import { JourneyState } from '../../state/reducers/journey';
import { JourneyStep } from '../../../common/runtime_types/ping/synthetics';
import { StepPageNavigation } from '../../components/monitor/synthetics/step_detail/step_page_nav';
import { StepPageTitleContent } from '../../components/monitor/synthetics/step_detail/step_page_title';
import { getJourneySteps } from '../../state/actions/journey';

export const useStepDetailPage = (): {
  activeStep?: JourneyStep;
  checkGroup: string;
  handleNextStep: () => void;
  handlePreviousStep: () => void;
  handleNextRun: () => void;
  handlePreviousRun: () => void;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
  journey?: JourneyState;
  stepIndex: number;
} => {
  const history = useHistory();
  const dispatch = useDispatch();

  const { checkGroupId: checkGroup, stepIndex: stepIndexString } = useParams<{
    checkGroupId: string;
    stepIndex: string;
  }>();

  useEffect(() => {
    if (checkGroup) {
      dispatch(getJourneySteps({ checkGroup, syntheticEventTypes: ['step/end'] }));
    }
  }, [dispatch, checkGroup]);

  const stepIndex = Number(stepIndexString);
  const journeys = useSelector(journeySelector);
  const journey: JourneyState | null = journeys[checkGroup] ?? null;

  const memoized = useMemo(
    () => ({
      hasPreviousStep: stepIndex > 1 ? true : false,
      activeStep: journey?.steps?.find((step) => step.synthetics?.step?.index === stepIndex),
      hasNextStep: journey && journey.steps && stepIndex < journey.steps.length ? true : false,
    }),
    [journey, stepIndex]
  );

  const handleNextStep = useCallback(() => {
    history.push(`/journey/${checkGroup}/step/${stepIndex + 1}`);
  }, [history, checkGroup, stepIndex]);

  const handlePreviousStep = useCallback(() => {
    history.push(`/journey/${checkGroup}/step/${stepIndex - 1}`);
  }, [history, checkGroup, stepIndex]);

  const handleNextRun = useCallback(() => {
    history.push(`/journey/${journey?.details?.next?.checkGroup}/step/1`);
  }, [history, journey?.details?.next?.checkGroup]);

  const handlePreviousRun = useCallback(() => {
    history.push(`/journey/${journey?.details?.previous?.checkGroup}/step/1`);
  }, [history, journey?.details?.previous?.checkGroup]);

  return {
    checkGroup,
    journey,
    stepIndex,
    ...memoized,
    handleNextStep,
    handlePreviousStep,
    handleNextRun,
    handlePreviousRun,
  };
};

export const StepDetailPageHeader = () => {
  const { activeStep, journey } = useStepDetailPage();
  return <>{journey && activeStep && activeStep.synthetics?.step?.name}</>;
};

export const StepDetailPageRightSideItem = () => {
  const [dateFormat] = useUiSetting$<string>('dateFormat');

  const { journey, handleNextRun, handlePreviousRun } = useStepDetailPage();

  if (!journey) return null;

  return (
    <StepPageNavigation
      dateFormat={dateFormat}
      handleNextRun={handleNextRun}
      handlePreviousRun={handlePreviousRun}
      nextCheckGroup={journey.details?.next?.checkGroup}
      previousCheckGroup={journey.details?.previous?.checkGroup}
      checkTimestamp={journey.details?.timestamp}
    />
  );
};

export const StepDetailPageChildren = () => {
  const {
    activeStep,
    hasPreviousStep,
    hasNextStep,
    handleNextStep,
    handlePreviousStep,
    journey,
    stepIndex,
  } = useStepDetailPage();

  if (!journey || !activeStep) return null;

  return (
    <StepPageTitleContent
      stepName={activeStep.synthetics?.step?.name ?? ''}
      stepIndex={stepIndex}
      totalSteps={journey.steps.length}
      hasPreviousStep={hasPreviousStep}
      hasNextStep={hasNextStep}
      handlePreviousStep={handlePreviousStep}
      handleNextStep={handleNextStep}
    />
  );
};
import { getDynamicSettings } from '../../state/actions/dynamic_settings';

export const StepDetailPage: React.FC = () => {
  useInitApp();
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();
  useTrackPageview({ app: 'uptime', path: 'stepDetail' });
  useTrackPageview({ app: 'uptime', path: 'stepDetail', delay: 15000 });
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  return <StepDetailContainer checkGroup={checkGroupId} stepIndex={Number(stepIndex)} />;
};

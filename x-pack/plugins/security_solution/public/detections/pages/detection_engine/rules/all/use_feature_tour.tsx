/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import React, { useEffect, useCallback } from 'react';

import { useEuiTour, EuiStatelessTourStep } from '@elastic/eui';
import * as i18n from '../translations';
import { useKibana } from '../../../../../common/lib/kibana';

const featuresTourSteps: EuiStatelessTourStep[] = [
  {
    step: 1,
    title: null,
    content: <p>{i18n.FEATURE_TOUR_IN_MEMORY_TABLE_STEP}</p>,
    stepsTotal: 2,
    children: <></>,
    onFinish: noop,
  },
  {
    step: 2,
    title: null,
    content: <p>{i18n.FEATURE_TOUR_BULK_ACTIONS_STEP}</p>,
    stepsTotal: 2,
    children: <></>,
    onFinish: noop,
    anchorPosition: 'rightUp',
  },
];

const tourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: i18n.FEATURE_TOUR_TITLE,
};

const STORAGE_KEY = 'securitySolutionFeatureTour';

export const useFeatureTour = () => {
  const { storage } = useKibana().services;

  const state = storage.get(STORAGE_KEY) ?? tourConfig;

  const [steps, actions, reducerState] = useEuiTour(featuresTourSteps, state);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reducerState));
  }, [reducerState]);

  const finishTour = useCallback(() => actions.finishTour(), [actions]);
  const goToNextStep = useCallback(() => actions.incrementStep(), [actions]);

  return {
    steps: {
      inMemoryTableStepProps: steps[0],
      bulkActionsStepProps: steps[1],
    },
    finishTour,
    goToNextStep,
  };
};

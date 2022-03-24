/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useMemo, FC } from 'react';

import { noop } from 'lodash';
import {
  useEuiTour,
  EuiTourState,
  EuiStatelessTourStep,
  EuiSpacer,
  EuiButton,
  EuiTourStepProps,
} from '@elastic/eui';
import { invariant } from '../../../../../../common/utils/invariant';
import { RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';

import * as i18n from '../translations';

export interface RulesFeatureTourContextType {
  steps: {
    inMemoryTableStepProps: EuiTourStepProps;
    bulkActionsStepProps: EuiTourStepProps;
  };
  goToNextStep: () => void;
  finishTour: () => void;
}

const TOUR_POPOVER_WIDTH = 360;

const featuresTourSteps: EuiStatelessTourStep[] = [
  {
    step: 1,
    title: i18n.FEATURE_TOUR_IN_MEMORY_TABLE_STEP_TITLE,
    content: <></>,
    stepsTotal: 2,
    children: <></>,
    onFinish: noop,
    maxWidth: TOUR_POPOVER_WIDTH,
  },
  {
    step: 2,
    title: i18n.FEATURE_TOUR_BULK_ACTIONS_STEP_TITLE,
    content: <p>{i18n.FEATURE_TOUR_BULK_ACTIONS_STEP}</p>,
    stepsTotal: 2,
    children: <></>,
    onFinish: noop,
    anchorPosition: 'rightUp',
    maxWidth: TOUR_POPOVER_WIDTH,
  },
];

const tourConfig: EuiTourState = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: TOUR_POPOVER_WIDTH,
  tourSubtitle: i18n.FEATURE_TOUR_TITLE,
};

const RulesFeatureTourContext = createContext<RulesFeatureTourContextType | null>(null);

/**
 * Context for new rules features, displayed in demo tour(euiTour)
 * It has a common state in useEuiTour, which allows transition from one step to the next, for components within it[context]
 * It also stores tour's state in localStorage
 */
export const RulesFeatureTourContextProvider: FC = ({ children }) => {
  const { storage } = useKibana().services;
  const initialStore = useMemo<EuiTourState>(
    () => ({
      ...tourConfig,
      ...(storage.get(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY) ?? tourConfig),
    }),
    [storage]
  );

  const [stepProps, actions, reducerState] = useEuiTour(featuresTourSteps, initialStore);

  const finishTour = actions.finishTour;
  const goToNextStep = actions.incrementStep;

  const inMemoryTableStepProps = useMemo(
    () => ({
      ...stepProps[0],
      content: (
        <>
          <p>{i18n.FEATURE_TOUR_IN_MEMORY_TABLE_STEP}</p>
          <EuiSpacer />
          <EuiButton color="primary" onClick={goToNextStep}>
            {i18n.FEATURE_TOUR_IN_MEMORY_TABLE_STEP_NEXT}
          </EuiButton>
        </>
      ),
    }),
    [stepProps, goToNextStep]
  );

  useEffect(() => {
    const { isTourActive, currentTourStep } = reducerState;
    storage.set(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY, { isTourActive, currentTourStep });
  }, [reducerState, storage]);

  const providerValue = useMemo(
    () => ({
      steps: {
        inMemoryTableStepProps,
        bulkActionsStepProps: stepProps[1],
      },
      finishTour,
      goToNextStep,
    }),
    [finishTour, goToNextStep, inMemoryTableStepProps, stepProps]
  );

  return (
    <RulesFeatureTourContext.Provider value={providerValue}>
      {children}
    </RulesFeatureTourContext.Provider>
  );
};

export const useRulesFeatureTourContext = (): RulesFeatureTourContextType => {
  const rulesFeatureTourContext = useContext(RulesFeatureTourContext);
  invariant(
    rulesFeatureTourContext,
    'useRulesFeatureTourContext should be used inside RulesFeatureTourContextProvider'
  );

  return rulesFeatureTourContext;
};

export const useRulesFeatureTourContextOptional = (): RulesFeatureTourContextType | null => {
  const rulesFeatureTourContext = useContext(RulesFeatureTourContext);

  return rulesFeatureTourContext;
};

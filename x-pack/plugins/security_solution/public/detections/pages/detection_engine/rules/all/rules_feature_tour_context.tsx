/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useMemo, FC } from 'react';

import { noop } from 'lodash';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTourState,
  EuiTourStepProps,
  EuiStatelessTourStep,
  useEuiTour,
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
    content: <p>{i18n.FEATURE_TOUR_IN_MEMORY_TABLE_STEP}</p>,
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

  const [tourSteps, tourActions, tourState] = useEuiTour(featuresTourSteps, initialStore);

  const enhancedSteps = useMemo<EuiTourStepProps[]>(() => {
    return tourSteps.map((item, index, array) => {
      return {
        ...item,
        content: (
          <>
            {item.content}
            <EuiSpacer />
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="primary"
                  size="s"
                  disabled={index === 0}
                  onClick={tourActions.decrementStep}
                >
                  {i18n.FEATURE_TOUR_PREV_STEP_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  size="s"
                  disabled={index === array.length - 1}
                  onClick={tourActions.incrementStep}
                >
                  {i18n.FEATURE_TOUR_NEXT_STEP_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ),
      };
    });
  }, [tourSteps, tourActions]);

  const providerValue = useMemo<RulesFeatureTourContextType>(
    () => ({
      steps: {
        inMemoryTableStepProps: enhancedSteps[0],
        bulkActionsStepProps: enhancedSteps[1],
      },
      finishTour: tourActions.finishTour,
      goToNextStep: tourActions.incrementStep,
    }),
    [enhancedSteps, tourActions]
  );

  useEffect(() => {
    const { isTourActive, currentTourStep } = tourState;
    storage.set(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY, { isTourActive, currentTourStep });
  }, [tourState, storage]);

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

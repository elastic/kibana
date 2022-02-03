/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, FC } from 'react';

import { noop } from 'lodash';
import {
  useEuiTour,
  EuiStatelessTourStep,
  EuiSpacer,
  EuiButton,
  EuiTourStepProps,
} from '@elastic/eui';
import { invariant } from '../../../../../../common/utils/invariant';
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

const featuresTourSteps: EuiStatelessTourStep[] = [
  {
    step: 1,
    title: null,
    content: null,
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

const STORAGE_KEY = 'securitySolution.rulesFeatureTour';

const RulesFeatureTourContext = createContext<RulesFeatureTourContextType | null>(null);

export const RulesFeatureTourContextProvider: FC = ({ children }) => {
  const { storage } = useKibana().services;
  const initialStore = useMemo(() => storage.get(STORAGE_KEY) ?? tourConfig, [storage]);

  const [[inMemoryTableStepProps, bulkActionsStepProps], actions, reducerState] = useEuiTour(
    featuresTourSteps,
    initialStore
  );

  const finishTour = useCallback(() => actions.finishTour(), [actions]);
  const goToNextStep = useCallback(() => actions.incrementStep(), [actions]);

  useEffect(() => {
    storage.set(STORAGE_KEY, reducerState);
  }, [reducerState, storage]);

  const providerValue = useMemo(
    () => ({
      steps: {
        inMemoryTableStepProps: {
          ...inMemoryTableStepProps,
          content: (
            <>
              <p>{i18n.FEATURE_TOUR_IN_MEMORY_TABLE_STEP}</p>
              <EuiSpacer />
              <EuiButton color="primary" onClick={goToNextStep}>
                {i18n.FEATURE_TOUR_IN_MEMORY_TABLE_STEP_NEXT}
              </EuiButton>
            </>
          ),
        },
        bulkActionsStepProps,
      },
      finishTour,
      goToNextStep,
    }),
    [finishTour, goToNextStep, bulkActionsStepProps, inMemoryTableStepProps]
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

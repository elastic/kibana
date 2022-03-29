/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useMemo, FC } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTourState,
  EuiStatelessTourStep,
  EuiTourStepProps,
  EuiTourActions,
  useEuiTour,
} from '@elastic/eui';

import { noop } from 'lodash';
import { invariant } from '../../../../../../../common/utils/invariant';
import { useKibana } from '../../../../../../common/lib/kibana';
import { RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY } from '../../../../../../../common/constants';

import * as i18n from './translations';

export interface RulesFeatureTourContextType {
  steps: EuiTourStepProps[];
  actions: EuiTourActions;
}

const TOUR_POPOVER_WIDTH = 360;

const tourConfig: EuiTourState = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: TOUR_POPOVER_WIDTH,
  tourSubtitle: i18n.TOUR_TITLE,
};

// This is an example. Replace with the steps for your particular version. Don't forget to use i18n.
const stepsConfig: EuiStatelessTourStep[] = [
  {
    step: 1,
    title: i18n.SEARCH_CAPABILITIES_TITLE,
    content: <p>{i18n.SEARCH_CAPABILITIES_DESCRIPTION}</p>,
    stepsTotal: 1,
    children: <></>,
    onFinish: noop,
    maxWidth: TOUR_POPOVER_WIDTH,
  },
];

const RulesFeatureTourContext = createContext<RulesFeatureTourContextType | null>(null);

/**
 * Context for new rules features, displayed in demo tour(euiTour)
 * It has a common state in useEuiTour, which allows transition from one step to the next, for components within it[context]
 * It also stores tour's state in localStorage
 */
export const RulesFeatureTourContextProvider: FC = ({ children }) => {
  const { storage } = useKibana().services;

  const restoredState = useMemo<EuiTourState>(
    () => ({
      ...tourConfig,
      ...(storage.get(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY) ?? tourConfig),
    }),
    [storage]
  );

  const [tourSteps, tourActions, tourState] = useEuiTour(stepsConfig, restoredState);

  const enhancedSteps = useMemo<EuiTourStepProps[]>(
    () =>
      tourSteps.map((item, index) => ({
        ...item,
        content: (
          <>
            {item.content}
            {tourSteps.length > 1 && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="arrowLeft"
                      aria-label="Go to previous step"
                      display="empty"
                      disabled={index === 0}
                      onClick={tourActions.decrementStep}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="arrowRight"
                      aria-label="Go to next step"
                      display="base"
                      disabled={index === tourSteps.length - 1}
                      onClick={tourActions.incrementStep}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </>
        ),
      })),
    [tourSteps, tourActions]
  );

  const providerValue = useMemo<RulesFeatureTourContextType>(
    () => ({ steps: enhancedSteps, actions: tourActions }),
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactChild } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import useObservable from 'react-use/lib/useObservable';
import { catchError, of, timeout } from 'rxjs';
import { useLocation } from 'react-router-dom';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { isDetectionsPath } from '../../../helpers';
import { useKibana } from '../../lib/kibana';
import { securityTourConfig, SecurityStepId } from './tour_config';

export interface TourContextValue {
  activeStep: number;
  endTourStep: (stepId: SecurityStepId) => void;
  incrementStep: (stepId: SecurityStepId) => void;
  isTourShown: (stepId: SecurityStepId) => boolean;
}

const initialState: TourContextValue = {
  activeStep: 0,
  endTourStep: () => {},
  incrementStep: () => {},
  isTourShown: () => false,
};

const TourContext = createContext<TourContextValue>(initialState);

export const RealTourContextProvider = ({ children }: { children: ReactChild }) => {
  const { guidedOnboardingApi } = useKibana().services.guidedOnboarding;

  const isRulesTourActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', SecurityStepId.rules).pipe(
      // if no result after 30s the observable will error, but the error handler will just emit false
      timeout(30000),
      catchError((error) => of(false))
    ) ?? of(false),
    false
  );
  const isAlertsCasesTourActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', SecurityStepId.alertsCases).pipe(
      // if no result after 30s the observable will error, but the error handler will just emit false
      timeout(30000),
      catchError((error) => of(false))
    ) ?? of(false),
    false
  );

  const tourStatus = useMemo(
    () => ({
      [SecurityStepId.rules]: isRulesTourActive,
      [SecurityStepId.alertsCases]: isAlertsCasesTourActive,
    }),
    [isRulesTourActive, isAlertsCasesTourActive]
  );

  const isTourShown = useCallback((stepId: SecurityStepId) => tourStatus[stepId], [tourStatus]);
  const [activeStep, _setActiveStep] = useState<number>(1);

  const incrementStep = useCallback((stepId: SecurityStepId) => {
    _setActiveStep(
      (prevState) => (prevState >= securityTourConfig[stepId].length ? 0 : prevState) + 1
    );
  }, []);

  // TODO: @Steph figure out if we're allowing user to skip tour or not, implement this if so
  // const onSkipTour = useCallback((stepId: SecurityStepId) => {
  //   // active state means the user is on this step but has not yet begun. so when the user hits skip,
  //   // the tour will go back to this step until they "re-start it"
  //   // guidedOnboardingApi.idkSetStepTo(stepId, 'active')
  // }, []);

  const [completeStep, setCompleteStep] = useState<null | SecurityStepId>(null);

  useEffect(() => {
    if (!completeStep || !guidedOnboardingApi) {
      return;
    }
    let ignore = false;
    const complete = async () => {
      await guidedOnboardingApi.completeGuideStep('security', completeStep);
      if (!ignore) {
        setCompleteStep(null);
        _setActiveStep(1);
      }
    };
    complete();
    return () => {
      ignore = true;
    };
  }, [completeStep, guidedOnboardingApi]);

  const endTourStep = useCallback((stepId: SecurityStepId) => {
    setCompleteStep(stepId);
  }, []);

  const context = {
    activeStep,
    endTourStep,
    incrementStep,
    isTourShown,
  };

  return <TourContext.Provider value={context}>{children}</TourContext.Provider>;
};

export const TourContextProvider = ({ children }: { children: ReactChild }) => {
  const { pathname } = useLocation();
  const isTourEnabled = useIsExperimentalFeatureEnabled('guidedOnboarding');

  const ContextProvider = useMemo(
    () =>
      isDetectionsPath(pathname) && isTourEnabled ? RealTourContextProvider : TourContext.Provider,
    [isTourEnabled, pathname]
  );

  return <ContextProvider value={initialState}>{children}</ContextProvider>;
};

export const useTourContext = (): TourContextValue => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTourContext can only be called inside of TourContext!');
  }
  return ctx;
};

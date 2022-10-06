/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactChild } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

import type { EuiTourStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTourStep,
  EuiText,
  EuiSpacer,
  EuiImage,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useKibana } from '../../lib/kibana';
import { tourConfig } from './tour_config';
import type { StepConfig } from './tour_config';

export const SECURITY_TOUR_ACTIVE_KEY = 'guidedOnboarding.security.tourActive';
export const SECURITY_TOUR_STEP_KEY = 'guidedOnboarding.security.tourStep';
const getIsTourActiveFromLocalStorage = (): boolean => {
  const localStorageValue = localStorage.getItem(SECURITY_TOUR_ACTIVE_KEY);
  return localStorageValue ? JSON.parse(localStorageValue) : false;
};
export const saveIsTourActiveToLocalStorage = (isTourActive: boolean): void => {
  localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(isTourActive));
};

export const getTourStepFromLocalStorage = (): number => {
  return Number(localStorage.getItem(SECURITY_TOUR_STEP_KEY) ?? 1);
};
const saveTourStepToLocalStorage = (step: number): void => {
  localStorage.setItem(SECURITY_TOUR_STEP_KEY, JSON.stringify(step));
};

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 2;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = true;

const getSteps = ({
  activeStep,
  incrementStep,
  resetTour,
}: {
  activeStep: number;
  incrementStep: () => void;
  resetTour: () => void;
}) => {
  const footerAction = (hideNextButton: boolean) => (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiButtonEmpty
          size="xs"
          color="text"
          onClick={() => resetTour()}
          data-test-subj="onboarding--securityTourSkipButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.guided_onboarding.skipTour.buttonLabel"
            defaultMessage="Skip tour"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      {!hideNextButton && (
        <EuiFlexItem>
          <EuiButton
            size="s"
            onClick={() => incrementStep()}
            color="success"
            data-test-subj="onboarding--securityTourNextStepButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.guided_onboarding.nextStep.buttonLabel"
              defaultMessage="Next"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
  const lastStepFooter = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      onClick={() => resetTour()}
      data-test-subj="onboarding--securityTourEndButton"
    >
      <FormattedMessage
        id="xpack.securitySolution.guided_onboarding.endTour.buttonLabel"
        defaultMessage="End tour"
      />
    </EuiButtonEmpty>
  );
  return tourConfig.map((stepConfig: StepConfig, i: number) => {
    const { content, imageConfig, dataTestSubj, hideNextButton = false, ...rest } = stepConfig;
    if (stepConfig.step === activeStep) {
      console.log('active step', stepConfig);
    }
    return stepConfig.step === activeStep ? (
      <EuiTourStep
        {...rest}
        minWidth={minWidth}
        maxWidth={maxWidth}
        offset={offset}
        repositionOnScroll={repositionOnScroll}
        stepsTotal={tourConfig.length}
        isStepOpen={stepConfig.step === activeStep}
        onFinish={() => resetTour()}
        // TODO: re-add panelProps
        // EUI has a bug https://github.com/elastic/eui/issues/6297
        // where any panelProps overwrite their panelProps,
        // so we lose cool things like the EuiBeacon
        // panelProps={{
        //   'data-test-subj': dataTestSubj,
        // }}
        content={
          <>
            <EuiText size="xs">
              <p>{content}</p>
            </EuiText>
            {imageConfig && (
              <>
                <EuiSpacer size="m" />
                <EuiImage alt={imageConfig.altText} src={imageConfig.src} size="fullWidth" />
              </>
            )}
          </>
        }
        footerAction={
          activeStep === tourConfig.length ? lastStepFooter : footerAction(hideNextButton)
        }
      />
    ) : null;
  });
};

export interface TourContextValue {
  activeStep: number;
  isTourShown: boolean;
  endTour: () => void;
  incrementStep: (step?: number) => void;
}

const TourContext = createContext<TourContextValue>({
  activeStep: 1,
  isTourShown: false,
  endTour: () => {},
  incrementStep: () => {},
} as TourContextValue);

export const TourContextProvider = ({ children }: { children: ReactChild }) => {
  const { guidedOnboardingApi } = useKibana().services.guidedOnboarding;
  const isPrimaryTourActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', 'alerts') ?? of(false),
    false
  );
  const tourActiveGuideState = useObservable(
    guidedOnboardingApi?.fetchActiveGuideState$() ?? of(undefined),
    undefined
  );
  const isGuidedOnboardingActive = useObservable(
    guidedOnboardingApi?.isGuidedOnboardingActiveForIntegration$('security') ?? of(undefined),
    undefined
  );
  const [isTourActive, _setIsTourActive] = useState<boolean>(isPrimaryTourActive);
  useEffect(() => _setIsTourActive(isPrimaryTourActive), [isPrimaryTourActive]);
  const setIsTourActive = useCallback((value: boolean) => {
    _setIsTourActive(value);
    saveIsTourActiveToLocalStorage(value);
  }, []);

  const [activeStep, _setActiveStep] = useState<number>(getTourStepFromLocalStorage());

  const incrementStep = useCallback((step?: number) => {
    _setActiveStep((prevState) => {
      const nextStep = step != null ? step : (prevState >= tourConfig.length ? 0 : prevState) + 1;
      saveTourStepToLocalStorage(nextStep);
      return nextStep;
    });
  }, []);

  const resetStep = useCallback(() => {
    _setActiveStep(1);
    saveTourStepToLocalStorage(1);
  }, []);

  const resetTour = useCallback(() => {
    setIsTourActive(false);
    resetStep();
  }, [setIsTourActive, resetStep]);

  const isSmallScreen = useIsWithinBreakpoints(['xs', 's']);
  const showTour = isTourActive && !isSmallScreen;
  const context: TourContextValue = {
    isTourShown: showTour,
    endTour: resetTour,
    incrementStep,
    activeStep,
  };

  const steps = useMemo(
    () => getSteps({ activeStep, incrementStep, resetTour }),
    [activeStep, incrementStep, resetTour]
  );

  return (
    <TourContext.Provider value={context}>
      <>
        {children}
        {showTour && <>{steps}</>}
      </>
    </TourContext.Provider>
  );
};

export const useTourContext = (): TourContextValue => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTourContext can only be called inside of TourContext!');
  }
  return ctx;
};

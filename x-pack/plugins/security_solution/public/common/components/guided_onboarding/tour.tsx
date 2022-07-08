/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactChild, useContext, useState, useCallback } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTourStep,
  EuiTourStepProps,
  EuiText,
  EuiSpacer,
  EuiImage,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../lib/kibana';

import { tourConfig } from './tour_config';

const SECURITY_TOUR_ACTIVE_KEY = 'guidedOnboarding.security.tourActive';
const SECURITY_TOUR_STEP_KEY = 'guidedOnboarding.security.tourStep';
const getIsTourActiveFromLocalStorage = (): boolean => {
  return Boolean(JSON.parse(String(localStorage.getItem(SECURITY_TOUR_ACTIVE_KEY))));
};
const saveIsTourActiveToLocalStorage = (isTourActive: boolean): void => {
  localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(isTourActive));
};

const getTourStepFromLocalStorage = (): number => {
  return Number(JSON.parse(String(localStorage.getItem(SECURITY_TOUR_STEP_KEY) ?? 1)));
};
const saveTourStepToLocalStorage = (step: number): void => {
  localStorage.setItem(SECURITY_TOUR_STEP_KEY, JSON.stringify(step));
};

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 30;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = false;

const getSteps = (tourControls: {
  activeStep: number;
  incrementStep: () => void;
  resetTour: () => void;
}) => {
  const { activeStep, incrementStep, resetTour } = tourControls;
  const footerAction = (
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
  return tourConfig.map((stepConfig) => {
    const { content, imageConfig, ...rest } = stepConfig;
    return (
      // @ts-expect-error
      <EuiTourStep
        {...rest}
        minWidth={minWidth}
        maxWidth={maxWidth}
        offset={offset}
        repositionOnScroll={repositionOnScroll}
        stepsTotal={tourConfig.length}
        isStepOpen={stepConfig.step === activeStep}
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
        footerAction={activeStep === tourConfig.length ? lastStepFooter : footerAction}
      />
    );
  });
};

export interface TourContextValue {
  isTourShown: boolean;
}

const TourContext = createContext<TourContextValue>({
  isTourShown: false,
} as TourContextValue);

export const TourContextProvider = ({ children }: { children: ReactChild }) => {
  const [isTourActive, _setIsTourActive] = useState<boolean>(getIsTourActiveFromLocalStorage());
  const setIsTourActive = useCallback((value: boolean) => {
    _setIsTourActive(value);
    saveIsTourActiveToLocalStorage(value);
  }, []);

  const [activeStep, _setActiveStep] = useState<number>(getTourStepFromLocalStorage());

  const incrementStep = useCallback(() => {
    _setActiveStep((prevState) => {
      const nextStep = (prevState >= tourConfig.length ? 0 : prevState) + 1;
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

  const { services } = useKibana();
  const hideAnnouncements = Boolean(services.uiSettings?.get('hideAnnouncements'));
  const isSmallScreen = useIsWithinBreakpoints(['xs', 's']);
  const showTour = isTourActive && !hideAnnouncements && !isSmallScreen;
  const context: TourContextValue = { isTourShown: showTour };
  return (
    <TourContext.Provider value={context}>
      <>
        {children}
        {showTour && <>{getSteps({ activeStep, incrementStep, resetTour })}</>}
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

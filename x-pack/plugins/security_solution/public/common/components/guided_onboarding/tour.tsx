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
  EuiOverlayMask,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import './tour.scss';

const SECURITY_TOUR_ACTIVE_KEY = 'guidedOnboarding.security.tourActive';
const SECURITY_TOUR_STEP_KEY = 'guidedOnboarding.security.tourStep';
const getIsTourActiveFromLocalStorage = (): boolean => {
  return Boolean(JSON.parse(String(localStorage.getItem(SECURITY_TOUR_ACTIVE_KEY))));
};
const saveIsTourActiveToLocalStorage = (isTourActive: boolean): void => {
  localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(isTourActive));
};

const getTourStepFromLocalStorage = (): number => {
  return Number(JSON.parse(String(localStorage.getItem(SECURITY_TOUR_STEP_KEY))));
};
const saveTourStepToLocalStorage = (step: number): void => {
  localStorage.setItem(SECURITY_TOUR_STEP_KEY, JSON.stringify(step));
};

type TourConfig = Array<
  Pick<EuiTourStepProps, 'step' | 'content' | 'anchor' | 'anchorPosition' | 'title' | 'subtitle'>
>;

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 30;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = false;

const tourConfig: TourConfig = [
  {
    step: 1,
    subtitle: 'Step #1',
    title: 'Welcome to Elastic Security',
    content: 'Take a quick tour of the Security solution to get a feel for how it works.',
    anchor: `[id^="KibanaPageTemplateSolutionNav"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 2,
    subtitle: 'Step #2',
    title: 'Create and install rules to detect and prevent malicious activity',
    content: 'Reprehenderit aute laborum ea amet proident voluptate minim do cillum anim.',
    anchor: `[data-test-subj="navigation-rules"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 3,
    subtitle: 'Step #3',
    title: 'Get notified when your security rules are triggered',
    content: 'Culpa enim consequat officia Lorem exercitation ex.',
    anchor: `[data-test-subj="navigation-alerts"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 4,
    subtitle: 'Step #4',
    title: 'Create a case to track activity that triggered your rules',
    content: 'Id et sit minim consectetur ea ut quis id laboris.',
    anchor: `[data-test-subj="navigation-cases"]`,
    anchorPosition: 'rightUp',
  },
  {
    step: 5,
    subtitle: 'Step #5',
    title: `You're ready!`,
    content: `View and add your first integration to start protecting your environment. Return to the Security solution when you're done.`,
    anchor: `[data-test-subj="add-data"]`,
    anchorPosition: 'rightUp',
  },
];

const getSteps = (
  activeStep: number,
  incrementStep: TourContextValue['incrementStep'],
  skipTour: TourContextValue['skipTour']
) => {
  const footerAction = (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiButtonEmpty size="xs" color="text" onClick={() => skipTour()}>
          <FormattedMessage
            id="xpack.securitySolution.guided_onboarding.skipTour.buttonLabel"
            defaultMessage="Skip"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton size="s" fill onClick={() => incrementStep()} color="success">
          <FormattedMessage
            id="xpack.securitySolution.guided_onboarding.nextStep.buttonLabel"
            defaultMessage="Next"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  const lastStepFooter = (
    <EuiButtonEmpty size="xs" color="text" onClick={() => skipTour()}>
      <FormattedMessage
        id="xpack.securitySolution.guided_onboarding.endTour.buttonLabel"
        defaultMessage="End tour"
      />
    </EuiButtonEmpty>
  );
  return tourConfig.map((stepConfig) => {
    return (
      // @ts-expect-error
      <EuiTourStep
        {...stepConfig}
        minWidth={minWidth}
        maxWidth={maxWidth}
        offset={offset}
        repositionOnScroll={repositionOnScroll}
        stepsTotal={tourConfig.length}
        isStepOpen={stepConfig.step === activeStep}
        footerAction={activeStep === tourConfig.length ? lastStepFooter : footerAction}
      />
    );
  });
};

export interface TourContextValue {
  incrementStep: () => void;
  skipTour: () => void;
  resetTour: () => void;
  isTourActive: boolean;
}

const TourContext = createContext<TourContextValue>({
  incrementStep: () => {},
  skipTour: () => {},
  resetTour: () => {},
  isTourActive: false,
} as TourContextValue);

export const TourContextProvider = ({ children }: { children: ReactChild }) => {
  const [isTourActive, _setIsTourActive] = useState<boolean>(getIsTourActiveFromLocalStorage());
  const setIsTourActive = useCallback((value: boolean) => {
    _setIsTourActive(value);
    saveIsTourActiveToLocalStorage(value);
  }, []);

  const [activeStep, _setActiveStep] = useState<number>(getTourStepFromLocalStorage());
  const setActiveStep = useCallback((value: number) => {
    _setActiveStep(value);
    saveTourStepToLocalStorage(value);
  }, []);

  const incrementStep = useCallback(() => {
    _setActiveStep((prevState) => {
      const nextStep = prevState + 1;
      saveTourStepToLocalStorage(nextStep);
      return nextStep;
    });
  }, []);
  const skipTour = useCallback(() => setIsTourActive(false), [setIsTourActive]);
  const resetTour = useCallback(() => {
    setActiveStep(1);
    setIsTourActive(true);
  }, [setActiveStep, setIsTourActive]);

  const context: TourContextValue = { incrementStep, skipTour, resetTour, isTourActive };

  return (
    <TourContext.Provider value={context}>
      <>
        {children}
        {isTourActive && (
          <>
            {getSteps(activeStep, incrementStep, skipTour)}
            <EuiOverlayMask className="securityTour__overlayMask" headerZindexLocation="below" />
          </>
        )}
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

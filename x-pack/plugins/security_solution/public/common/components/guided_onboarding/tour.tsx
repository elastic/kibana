/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactChild } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { EuiTourStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTourStep,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useKibana } from '../../lib/kibana';
import type { StepConfig } from './tour_config';
import { tourConfig } from './tour_config';

/**
 * OLM team - when you implement your steps, you may or may not want to use local storage. I did not need it for the 'alertsCases' step
 * For now I have commented the local storage helpers out. If you end up not using them, please delete. Thanks!
 * export const SECURITY_TOUR_ACTIVE_KEY = 'guidedOnboarding.security.tourActive';
 * export const SECURITY_TOUR_STEP_KEY = 'guidedOnboarding.security.tourStep';
 *
 * const getIsTourActiveFromLocalStorage = (): boolean => {
 *   const localStorageValue = localStorage.getItem(SECURITY_TOUR_ACTIVE_KEY);
 *   return localStorageValue ? JSON.parse(localStorageValue) : false;
 * };
 *
 * export const saveIsTourActiveToLocalStorage = (isTourActive: boolean): void => {
 *   localStorage.setItem(SECURITY_TOUR_ACTIVE_KEY, JSON.stringify(isTourActive));
 * };
 *
 * export const getTourStepFromLocalStorage = (): number => {
 *   return Number(localStorage.getItem(SECURITY_TOUR_STEP_KEY) ?? 1);
 * };
 * const saveTourStepToLocalStorage = (step: number): void => {
 *   localStorage.setItem(SECURITY_TOUR_STEP_KEY, JSON.stringify(step));
 * };
 */

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 10;
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
  const getFooterAction = (hideNextButton: boolean): EuiTourStepProps['footerAction'] =>
    !hideNextButton ? (
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
    ) : (
      <>
        {/* Passing empty element instead of undefined. If undefined "Skip tour" button is shown, we do not want that*/}
      </>
    );

  return tourConfig.map((stepConfig: StepConfig) => {
    const { content, imageConfig, dataTestSubj, hideNextButton = false, ...rest } = stepConfig;

    /* important not to mount until the step is active,
     * otherwise the tourConfig[0].anchor may not yet exist in the DOM to mount the step to
     */
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
        footerAction={getFooterAction(hideNextButton)}
      />
    ) : null;
  });
};

export interface TourContextValue {
  activeStep: number;
  isTourShown: boolean;
  endTour: () => void;
  // Calling this in components with tour anchor tags alleviates a race condition where the active step attempts to mount before the tour anchor is mounted
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
    guidedOnboardingApi?.isGuideStepActive$('security', 'alertsCases') ?? of(false),
    false
  );

  const [isTourActive, _setIsTourActive] = useState<boolean>(isPrimaryTourActive);

  useEffect(() => {
    _setIsTourActive(isPrimaryTourActive);
  }, [isPrimaryTourActive]);

  const setIsTourActive = useCallback((value: boolean) => {
    _setIsTourActive(value);
  }, []);

  // always start with step 0, at least for 'alertsCases'. We increment the step from where the tour anchor
  // is in some places to ensure that the anchor exists before the step is active for mounting purposes
  const [activeStep, _setActiveStep] = useState<number>(0);

  const incrementStep = useCallback((step?: number) => {
    _setActiveStep((prevState) =>
      step != null ? step : (prevState >= tourConfig.length ? 0 : prevState) + 1
    );
  }, []);

  const resetStep = useCallback(() => {
    _setActiveStep(1);
  }, []);

  const resetTour = useCallback(() => {
    setIsTourActive(false);
    resetStep();
  }, [setIsTourActive, resetStep]);

  const endTour = useCallback(async () => {
    resetTour();
    await guidedOnboardingApi?.completeGuideStep('security', 'alertsCases');
  }, [resetTour, guidedOnboardingApi]);

  const isSmallScreen = useIsWithinBreakpoints(['xs', 's']);
  const showTour = isTourActive && !isSmallScreen;

  const context: TourContextValue = {
    isTourShown: showTour,
    endTour,
    incrementStep,
    activeStep,
  };

  const steps = useMemo(
    () => (showTour ? getSteps({ activeStep, incrementStep, resetTour }) : null),
    [activeStep, incrementStep, resetTour, showTour]
  );

  return (
    <TourContext.Provider value={context}>
      <>
        {children}
        {steps}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactChild } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

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
import { securityTourConfig, SecurityStepId, getTourAnchor } from './tour_config';
import { Delayed } from './helpers';

interface SecurityTourStep {
  step: number;
  stepId: SecurityStepId;
}

export const SecurityTourStep = ({ step, stepId }: SecurityTourStep) => {
  const { activeStep, incrementStep } = useTourContext();
  const tourStep = useMemo(
    () => securityTourConfig[stepId].find((config) => config.step === step),
    [step, stepId]
  );
  if (step !== activeStep || tourStep == null) {
    return null;
  }
  const { content, imageConfig, dataTestSubj, hideNextButton = false, ...rest } = tourStep;

  const footerAction: EuiTourStepProps['footerAction'] = !hideNextButton ? (
    <EuiButton
      size="s"
      onClick={() => incrementStep(stepId)}
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
  return (
    <EuiTourStep
      {...rest}
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
      footerAction={footerAction}
      isStepOpen={step === activeStep}
      // guided onboarding does not allow skipping tour through the steps
      onFinish={() => null}
      stepsTotal={securityTourConfig[stepId].length}
      // TODO: re-add panelProps
      // EUI has a bug https://github.com/elastic/eui/issues/6297
      // where any panelProps overwrite their panelProps,
      // so we lose cool things like the EuiBeacon
      // panelProps={{
      //   'data-test-subj': dataTestSubj,
      // }}
    />
  );
};

interface GuidedOnboardingTourStep extends SecurityTourStep {
  // if true, this component renders the tour step only (not the anchor)
  altAnchor?: boolean;
  children: React.ReactNode;
  isTourAnchor: boolean;
}

// wraps tour anchor component
// and gives the tour step itself a place to mount once it is active
// mounts the tour step with a delay to ensure the anchor will render first
export const GuidedOnboardingTourStep = ({
  altAnchor = false,
  children,
  isTourAnchor,
  step,
  stepId,
}: GuidedOnboardingTourStep) =>
  isTourAnchor ? (
    <span tour-step={altAnchor ? '' : getTourAnchor(step, stepId)}>
      <Delayed>
        <SecurityTourStep step={step} stepId={stepId} />
      </Delayed>
      {children}
    </span>
  ) : (
    <>{children}</>
  );

export interface TourContextValue {
  activeStep: number;
  isTourShown: (stepId: SecurityStepId) => boolean;
  endTourStep: (stepId: SecurityStepId) => void;
  // Calling this in components with tour anchor tags alleviates a race condition
  // where the active step attempts to mount before the tour anchor is mounted
  incrementStep: (stepId: SecurityStepId, step?: number) => void;
}

const initialState: TourContextValue = {
  activeStep: 1,
  isTourShown: () => false,
  endTourStep: () => {},
  incrementStep: () => {},
};

const TourContext = createContext<TourContextValue>(initialState);

export const TourContextProvider = ({ children }: { children: ReactChild }) => {
  const { guidedOnboardingApi } = useKibana().services.guidedOnboarding;
  const isAddDataTourActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', SecurityStepId.addData) ?? of(false),
    false
  );
  const isRulesTourActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', SecurityStepId.rules) ?? of(false),
    false
  );
  const isAlertsCasesTourActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', SecurityStepId.alertsCases) ?? of(false),
    false
  );

  const tourStatus = useMemo(
    () => ({
      [SecurityStepId.addData]: isAddDataTourActive,
      [SecurityStepId.rules]: isRulesTourActive,
      [SecurityStepId.alertsCases]: isAlertsCasesTourActive,
    }),
    [isAddDataTourActive, isRulesTourActive, isAlertsCasesTourActive]
  );

  const isSmallScreen = useIsWithinBreakpoints(['xs', 's']);
  const isTourShown = useCallback(
    (stepId: SecurityStepId) => tourStatus[stepId] && !isSmallScreen,
    [isSmallScreen, tourStatus]
  );

  const [activeStep, _setActiveStep] = useState<number>(1);

  const incrementStep = useCallback((stepId: SecurityStepId, step?: number) => {
    _setActiveStep((prevState) =>
      step != null ? step : (prevState >= securityTourConfig[stepId].length ? 0 : prevState) + 1
    );
  }, []);

  const resetStep = useCallback(() => {
    _setActiveStep(1);
  }, []);

  const resetTour = useCallback(() => {
    resetStep();
  }, [resetStep]);

  const endTourStep = useCallback(
    async (stepId: SecurityStepId) => {
      resetTour();
      await guidedOnboardingApi?.completeGuideStep('security', stepId);
    },
    [resetTour, guidedOnboardingApi]
  );

  const context = {
    isTourShown,
    endTourStep,
    incrementStep,
    activeStep,
  };

  return <TourContext.Provider value={context}>{children}</TourContext.Provider>;
};

export const useTourContext = (): TourContextValue => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTourContext can only be called inside of TourContext!');
  }
  return ctx;
};

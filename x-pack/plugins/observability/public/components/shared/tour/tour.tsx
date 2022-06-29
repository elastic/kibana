/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useState, useCallback, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTourStep,
  EuiTourStepProps,
  EuiImage,
  EuiSpacer,
  EuiText,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { ApplicationStart } from '@kbn/core/public';
import { observabilityAppId } from '../../../../common';
import { tourStepsConfig } from './steps_config';

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 30;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = false;

const overviewPath = '/overview';
const guidedSetupStep = 6;

const observTourActiveStorageKey = 'guidedOnboarding.observability.tourActive';
const observTourStepStorageKey = 'guidedOnboarding.observability.tourStep';

const getSteps = ({
  activeStep,
  incrementStep,
  endTour,
  prependBasePath,
}: {
  activeStep: number;
  incrementStep: () => void;
  endTour: () => void;
  prependBasePath?: (imageName: string) => string;
}) => {
  const footerAction = (
    <EuiFlexGroup gutterSize="s" alignItems="baseline">
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={() => endTour()}
          size="xs"
          color="text"
          // Used for testing and to track FS usage
          data-test-subj="onboarding--observTourSkipButton"
        >
          {i18n.translate('xpack.observability.tour.skipButtonLabel', {
            defaultMessage: 'Skip tour',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          onClick={() => incrementStep()}
          size="s"
          color="success"
          // Used for testing and to track FS usage
          data-test-subj="onboarding--observTourNextStepButton"
        >
          {i18n.translate('xpack.observability.tour.nextButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const lastStepFooterAction = (
    // data-test-subj is used for testing and to track FS usage
    <EuiButtonEmpty
      size="xs"
      color="text"
      onClick={() => endTour()}
      data-test-subj="onboarding--observTourEndButton"
    >
      {i18n.translate('xpack.observability.tour.endButtonLabel', {
        defaultMessage: 'End tour',
      })}
    </EuiButtonEmpty>
  );

  return tourStepsConfig.map((stepConfig, index) => {
    const step = index + 1;
    const { dataTestSubj, content, imageConfig, ...tourStepProps } = stepConfig;
    return (
      <EuiTourStep
        {...tourStepProps}
        key={step}
        step={step}
        minWidth={minWidth}
        maxWidth={maxWidth}
        offset={offset}
        repositionOnScroll={repositionOnScroll}
        stepsTotal={tourStepsConfig.length}
        isStepOpen={step === activeStep}
        onFinish={() => endTour()}
        footerAction={activeStep === tourStepsConfig.length ? lastStepFooterAction : footerAction}
        panelProps={{
          'data-test-subj': dataTestSubj,
        }}
        content={
          <>
            <EuiText size="s">
              <p>{content}</p>
            </EuiText>
            {imageConfig && prependBasePath && (
              <>
                <EuiSpacer size="m" />
                <EuiImage
                  alt={imageConfig.altText}
                  src={prependBasePath(`/plugins/observability/assets/${imageConfig.name}`)}
                  size="fullWidth"
                />
              </>
            )}
          </>
        }
      />
    );
  });
};

interface TourState {
  activeStep: number;
  isTourActive: boolean;
}

const getInitialTourState = ({
  prevIsTourActive,
  prevActiveStep,
}: {
  prevIsTourActive: string | null;
  prevActiveStep: string | null;
}): TourState => {
  if (prevIsTourActive === null) {
    return {
      activeStep: 1,
      // Tour is inactive by default
      isTourActive: false,
    };
  }

  const isTourActive = prevIsTourActive === 'true';
  const activeStep = prevActiveStep === null ? 1 : Number(prevActiveStep);

  return {
    activeStep,
    isTourActive,
  };
};

export function ObservabilityTour({
  children,
  navigateToApp,
  isPageDataLoaded,
  showTour,
  prependBasePath,
}: {
  children: ({ isTourVisible }: { isTourVisible: boolean }) => ReactNode;
  navigateToApp: ApplicationStart['navigateToApp'];
  isPageDataLoaded: boolean;
  showTour: boolean;
  prependBasePath?: (imageName: string) => string;
}) {
  const prevIsTourActive = localStorage.getItem(observTourActiveStorageKey);
  const prevActiveStep = localStorage.getItem(observTourStepStorageKey);

  const { activeStep: initialActiveStep, isTourActive: initialIsTourActive } = getInitialTourState({
    prevIsTourActive,
    prevActiveStep,
  });

  const [isTourActive, setIsTourActive] = useState(initialIsTourActive);
  const [activeStep, setActiveStep] = useState(initialActiveStep);

  const { pathname: currentPath } = useLocation();

  const isSmallBreakpoint = useIsWithinBreakpoints(['s']);

  const isOverviewPage = currentPath === overviewPath;

  const incrementStep = useCallback(() => {
    setActiveStep((prevState) => prevState + 1);
  }, []);

  const endTour = useCallback(() => setIsTourActive(false), []);

  /**
   * The tour should only be visible if the following conditions are met:
   * - Only pages with the side nav should show the tour (showTour === true)
   * - Tour is set to active per localStorage setting (isTourActive === true)
   * - Any page data must be loaded in order for the tour to render correctly
   * - The tour should only render on medium-large screens
   */
  const isTourVisible = showTour && isTourActive && isPageDataLoaded && isSmallBreakpoint === false;

  useEffect(() => {
    localStorage.setItem(observTourActiveStorageKey, String(isTourActive));
  }, [isTourActive]);

  useEffect(() => {
    localStorage.setItem(observTourStepStorageKey, String(activeStep));
  }, [activeStep]);

  useEffect(() => {
    // The user must be on the overview page to view the guided setup step in the tour
    if (isTourActive && isOverviewPage === false && activeStep === guidedSetupStep) {
      navigateToApp(observabilityAppId, {
        path: overviewPath,
      });
    }
  }, [activeStep, isOverviewPage, isTourActive, navigateToApp]);

  return (
    <>
      {children({ isTourVisible })}
      {isTourVisible && getSteps({ activeStep, incrementStep, endTour, prependBasePath })}
    </>
  );
}

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
  EuiText,
  ElementTarget,
  EuiOverlayMask,
} from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { ApplicationStart } from '@kbn/core/public';
import { observabilityAppId } from '../../../../common';
import { useHasData } from '../../../hooks/use_has_data';

import './tour.scss';

interface TourStep {
  content: EuiTourStepProps['content'];
  anchor: ElementTarget;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: EuiTourStepProps['title'];
  dataTestSubj: string;
  showOverlay: boolean;
}

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 30;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = false;

const overviewPath = '/overview';
const guidedSetupStep = 6;

const observabilityTourStorageKey = 'xpack.observability.tourState';

const tourStepsConfig: TourStep[] = [
  {
    title: i18n.translate('xpack.observability.tour.observabilityOverviewStep.tourTitle', {
      defaultMessage: 'Welcome to Elastic Observability',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.observabilityOverviewStep.tourContent', {
          defaultMessage:
            'Take a quick tour of the Observability solution to get a feel for how it works.',
        })}
      </EuiText>
    ),
    anchor: `[id^="KibanaPageTemplateSolutionNav"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'overviewStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.streamStep.tourTitle', {
      defaultMessage: 'View all your infrastructure logs in real time',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.streamStep.tourContent', {
          defaultMessage:
            'Reprehenderit aute laborum ea amet proident voluptate minim do cillum anim.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="stream"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'streamStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.metricsExplorerStep.tourTitle', {
      defaultMessage: 'Inspect your overall infrastructure performance',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.metricsExplorerStep.tourContent', {
          defaultMessage:
            'Reprehenderit aute laborum ea amet proident voluptate minim do cillum anim.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="metrics_explorer"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'metricsExplorerStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.tracesStep.tourTitle', {
      defaultMessage: 'Understand the entire lifecycle of a request/action',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.tracesStep.tourContent', {
          defaultMessage:
            'Reprehenderit aute laborum ea amet proident voluptate minim do cillum anim.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="traces"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'tracesStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.alertsStep.tourTitle', {
      defaultMessage: 'Get notified when something goes wrong',
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.alertsStep.tourContent', {
          defaultMessage:
            'Reprehenderit aute laborum ea amet proident voluptate minim do cillum anim.',
        })}
      </EuiText>
    ),
    anchor: `[data-nav-id="alerts"]`,
    anchorPosition: 'rightUp',
    dataTestSubj: 'alertStep',
    showOverlay: true,
  },
  {
    title: i18n.translate('xpack.observability.tour.guidedSetupStep.tourTitle', {
      defaultMessage: `You're ready!`,
    }),
    content: (
      <EuiText>
        {i18n.translate('xpack.observability.tour.guidedSetupStep.tourContent', {
          defaultMessage: 'View the guided setup to learn about next steps.',
        })}
      </EuiText>
    ),
    anchor: '#guidedSetupButton',
    anchorPosition: 'rightUp',
    dataTestSubj: 'guidedSetupStep',
    showOverlay: false,
  },
];

const getSteps = ({
  activeStep,
  incrementStep,
  endTour,
}: {
  activeStep: number;
  incrementStep: () => void;
  endTour: () => void;
}) => {
  const footerAction = (
    <EuiFlexGroup gutterSize="s" alignItems="baseline">
      <EuiFlexItem>
        <EuiButtonEmpty
          onClick={() => endTour()}
          size="xs"
          color="text"
          data-test-subj="skipButton"
        >
          {i18n.translate('xpack.observability.tour.skipButtonLabel', {
            defaultMessage: 'Skip',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          onClick={() => incrementStep()}
          size="s"
          color="success"
          data-test-subj="nextButton"
        >
          {i18n.translate('xpack.observability.tour.nextButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const lastStepFooterAction = (
    <EuiButtonEmpty size="xs" color="text" onClick={() => endTour()} data-test-subj="endButton">
      {i18n.translate('xpack.observability.tour.endButtonLabel', {
        defaultMessage: 'End tour',
      })}
    </EuiButtonEmpty>
  );

  return tourStepsConfig.map((stepConfig, index) => {
    const step = index + 1;
    const { dataTestSubj, showOverlay, ...tourStepProps } = stepConfig;
    return (
      <EuiTourStep
        {...tourStepProps}
        key={step}
        subtitle={i18n.translate('xpack.observability.tour.subtitleLabel', {
          defaultMessage: 'Step {stepNumber}',
          values: {
            stepNumber: step,
          },
        })}
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
      />
    );
  });
};

interface TourState {
  activeStep: number;
  isTourActive: boolean;
}

const getInitialTourState = (prevTourState: string | null): TourState => {
  if (prevTourState) {
    try {
      const parsedPrevTourState = JSON.parse(prevTourState);
      return parsedPrevTourState as TourState;
    } catch (e) {
      // Fall back to default state
    }
  }

  return {
    activeStep: 1,
    // TODO this will default to false once we added the workflow landing page and localStorage is set there
    isTourActive: true,
  };
};

export function ObservabilityOverviewTour({
  children,
  navigateToApp,
}: {
  children: ReactNode;
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const prevTourState = localStorage.getItem(observabilityTourStorageKey);
  const { activeStep: initialActiveStep, isTourActive: initialIsTourActive } =
    getInitialTourState(prevTourState);

  const [isTourActive, setIsTourActive] = useState(initialIsTourActive);
  const [activeStep, setActiveStep] = useState(initialActiveStep);

  const { hasAnyData, isAllRequestsComplete } = useHasData();
  const { pathname: currentPath } = useLocation();

  const isOverviewPage = currentPath === overviewPath;
  const { showOverlay } = tourStepsConfig[activeStep - 1];

  const incrementStep = useCallback(() => {
    setActiveStep((prevState) => prevState + 1);
  }, []);

  const endTour = useCallback(() => setIsTourActive(false), []);

  const shouldShowTour = useCallback(() => {
    if (isOverviewPage) {
      // We must wait for data to load on the overview page in order for the last step in the tour to render correctly
      return Boolean(isTourActive && isAllRequestsComplete && hasAnyData);
    }
    return isTourActive;
  }, [hasAnyData, isAllRequestsComplete, isOverviewPage, isTourActive]);

  useEffect(() => {
    localStorage.setItem(observabilityTourStorageKey, JSON.stringify({ isTourActive, activeStep }));
  }, [isTourActive, activeStep]);

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
      {children}
      {shouldShowTour() && (
        <>
          {getSteps({ activeStep, incrementStep, endTour })}
          {showOverlay && (
            <EuiOverlayMask
              className="observabilityTour__overlayMask"
              headerZindexLocation="below"
            />
          )}
        </>
      )}
    </>
  );
}

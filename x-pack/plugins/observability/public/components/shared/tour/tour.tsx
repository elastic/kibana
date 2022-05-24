/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useState, useCallback } from 'react';

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
} from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { ApplicationStart } from '@kbn/core/public';
import { observabilityAppId } from '../../../../common';
import { useHasData } from '../../../hooks/use_has_data';

interface TourStep {
  content: EuiTourStepProps['content'];
  anchor: ElementTarget;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: EuiTourStepProps['title'];
}

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 30;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = false;

const overviewPath = '/overview';

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
        <EuiButtonEmpty onClick={() => endTour()} size="xs" color="text">
          {i18n.translate('xpack.observability.tour.skipButtonLabel', {
            defaultMessage: 'Skip',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton onClick={() => incrementStep()} size="s" color="success">
          {i18n.translate('xpack.observability.tour.nextButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return tourStepsConfig.map((stepConfig, index) => {
    const step = index + 1;
    return (
      <EuiTourStep
        {...stepConfig}
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
        footerAction={activeStep === tourStepsConfig.length ? undefined : footerAction}
        onFinish={() => endTour()}
      />
    );
  });
};

export function ObservabilityOverviewTour({
  children,
  navigateToApp,
}: {
  children: ReactNode;
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const [isTourActive, setIsTourActive] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  const { hasAnyData, isAllRequestsComplete } = useHasData();
  const { pathname: currentPath } = useLocation();

  const isOverviewPage = currentPath === overviewPath;

  const incrementStep = useCallback(() => {
    // The user must be on the overview page to view the last step in the tour
    // TODO this logic feels brittle if we ever change the steps/step order
    if (isOverviewPage === false && activeStep === tourStepsConfig.length - 1) {
      return navigateToApp(observabilityAppId, {
        path: overviewPath,
      });
    }

    setActiveStep((prevState) => prevState + 1);
  }, [activeStep, isOverviewPage, navigateToApp]);

  const endTour = useCallback(() => setIsTourActive(false), []);

  const shouldShowTour = useCallback(() => {
    if (isOverviewPage) {
      // We must wait for data to load on the overview page in order for the last step in the tour to render correctly
      return Boolean(isTourActive && isAllRequestsComplete && hasAnyData);
    }
    return isTourActive;
  }, [hasAnyData, isAllRequestsComplete, isOverviewPage, isTourActive]);

  return (
    <>
      {children}
      {shouldShowTour() && getSteps({ activeStep, incrementStep, endTour })}
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStatelessTourStep,
  EuiText,
  EuiTourStep,
  useEuiTour,
} from '@elastic/eui';

const TOUR_POPOVER_MAX_WIDTH = 360;

const observabilityTourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: i18n.translate('xpack.observability.tour.tourSubTitle', {
    defaultMessage: 'Elastic Observability tour',
  }),
};

const observabilityTourSteps = [
  {
    anchor: '.euiSideNav__heading', // TODO better anchor here?
    maxWidth: TOUR_POPOVER_MAX_WIDTH,
    step: 1,
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
    anchorPosition: 'rightCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-nav-id="stream"]',
    maxWidth: TOUR_POPOVER_MAX_WIDTH,
    step: 2,
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
    anchorPosition: 'rightCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-nav-id="metrics_explorer"]',
    maxWidth: TOUR_POPOVER_MAX_WIDTH,
    step: 3,
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
    anchorPosition: 'rightCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-nav-id="traces"]',
    maxWidth: TOUR_POPOVER_MAX_WIDTH,
    step: 4,
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
    anchorPosition: 'rightCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-nav-id="alerts"]',
    maxWidth: TOUR_POPOVER_MAX_WIDTH,
    step: 5,
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
    anchorPosition: 'rightCenter',
  } as EuiStatelessTourStep,
  // TODO add last step - "Guided setup"
];

export function ObservabilityTour() {
  const [tourStepProps, actions] = useEuiTour(observabilityTourSteps, observabilityTourConfig);

  const footerAction = (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButtonEmpty onClick={() => actions.finishTour()} size="s">
          {i18n.translate('xpack.observability.tour.skipButtonLabel', {
            defaultMessage: 'Skip',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton onClick={() => actions.incrementStep()} size="s" fill>
          {i18n.translate('xpack.observability.tour.nextButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {tourStepProps.map((stepProps, index) => {
        const isLastStep = index === tourStepProps.length - 1;
        return <EuiTourStep {...stepProps} footerAction={isLastStep ? undefined : footerAction} />;
      })}
    </>
  );
}

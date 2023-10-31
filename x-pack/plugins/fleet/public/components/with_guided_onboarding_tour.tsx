/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { FunctionComponent, ReactElement } from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
import { EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type TourType = 'addIntegrationButton' | 'integrationCard' | 'agentModalButton';
const getTourConfig = (packageKey: string, tourType: TourType) => {
  if (packageKey.startsWith('endpoint') && tourType === 'addIntegrationButton') {
    return {
      title: i18n.translate('xpack.fleet.guidedOnboardingTour.endpointButton.title', {
        defaultMessage: 'Add Elastic Defend',
      }),
      description: i18n.translate('xpack.fleet.guidedOnboardingTour.endpointButton.description', {
        defaultMessage: `In this workflow, we'll be using Elastic Defend only to collect data for SIEM. Installing this will not conflict with existing endpoint security products.`,
      }),
    };
  }

  if (packageKey.startsWith('endpoint') && tourType === 'integrationCard') {
    return {
      title: i18n.translate('xpack.fleet.guidedOnboardingTour.endpointCard.title', {
        defaultMessage: 'Select Elastic Defend',
      }),
      description: i18n.translate('xpack.fleet.guidedOnboardingTour.endpointCard.description', {
        defaultMessage: 'The best way to get data quickly into your SIEM.',
      }),
    };
  }

  if (packageKey.startsWith('kubernetes') && tourType === 'addIntegrationButton') {
    return {
      title: i18n.translate('xpack.fleet.guidedOnboardingTour.kubernetesButton.tourTitle', {
        defaultMessage: 'Add Kubernetes',
      }),
      description: i18n.translate(
        'xpack.fleet.guidedOnboardingTour.kubernetesButton.tourDescription',
        {
          defaultMessage:
            'In just a few steps, add your data with our recommended defaults. You can change this later.',
        }
      ),
    };
  }

  if (packageKey.startsWith('kubernetes') && tourType === 'agentModalButton') {
    return {
      title: i18n.translate('xpack.fleet.guidedOnboardingTour.agentModalButton.tourTitle', {
        defaultMessage: 'Add Elastic Agent',
      }),
      description: i18n.translate(
        'xpack.fleet.guidedOnboardingTour.agentModalButton.tourDescription',
        {
          defaultMessage:
            'In order to proceed with your setup, add Elastic Agent to your hosts now.',
        }
      ),
    };
  }

  return null;
};
export const WithGuidedOnboardingTour: FunctionComponent<{
  packageKey: string;
  isTourVisible: boolean;
  tourType: TourType;
  tourPosition?: EuiTourStepProps['anchorPosition'];
  children: ReactElement;
  tourOffset?: EuiTourStepProps['offset'];
}> = ({ packageKey, isTourVisible, tourType, children, tourPosition, tourOffset }) => {
  const [isGuidedOnboardingTourOpen, setIsGuidedOnboardingTourOpen] =
    useState<boolean>(isTourVisible);
  useEffect(() => {
    setIsGuidedOnboardingTourOpen(isTourVisible);
  }, [isTourVisible]);
  const config = getTourConfig(packageKey, tourType);

  return config ? (
    <EuiTourStep
      content={<EuiText size="s">{config.description}</EuiText>}
      isStepOpen={isGuidedOnboardingTourOpen}
      maxWidth={350}
      onFinish={() => setIsGuidedOnboardingTourOpen(false)}
      step={1}
      stepsTotal={1}
      offset={tourOffset}
      title={config.title}
      anchorPosition={tourPosition ? tourPosition : 'rightUp'}
      footerAction={
        <EuiButtonEmpty
          onClick={() => setIsGuidedOnboardingTourOpen(false)}
          size="xs"
          color="text"
          flush="right"
        >
          {i18n.translate('xpack.fleet.guidedOnboardingTour.nextButtonLabel', {
            defaultMessage: 'Continue',
          })}
        </EuiButtonEmpty>
      }
      isOpen={isGuidedOnboardingTourOpen}
      // Close the tour when the user clicks outside of the tour. This is a workaround for
      // popover remaining open when the user changes the category of the integration list
      closePopover={() => setIsGuidedOnboardingTourOpen(false)}
    >
      {children}
    </EuiTourStep>
  ) : (
    <>{children}</>
  );
};

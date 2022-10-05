/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { FunctionComponent, ReactElement } from 'react';
import { EuiButton, EuiText, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type TourType = 'addIntegrationButton' | 'integrationsList';
const getTourConfig = (packageKey: string, tourType: TourType) => {
  if (packageKey.startsWith('endpoint') && tourType === 'addIntegrationButton') {
    return {
      title: i18n.translate('xpack.fleet.guidedOnboardingTour.endpointButton.title', {
        defaultMessage: 'Add Elastic Defend',
      }),
      description: i18n.translate('xpack.fleet.guidedOnboardingTour.endpointButton.description', {
        defaultMessage:
          'In just a few steps, configure your data with our recommended defaults. You can change this later.',
      }),
    };
  }
  return null;
};
export const WithGuidedOnboardingTour: FunctionComponent<{
  packageKey: string;
  isGuidedOnboardingActive: boolean;
  tourType: TourType;
  children: ReactElement;
}> = ({ packageKey, isGuidedOnboardingActive, tourType, children }) => {
  const [isGuidedOnboardingTourOpen, setIsGuidedOnboardingTourOpen] =
    useState<boolean>(isGuidedOnboardingActive);
  useEffect(() => {
    setIsGuidedOnboardingTourOpen(isGuidedOnboardingActive);
  }, [isGuidedOnboardingActive]);
  const config = getTourConfig(packageKey, tourType);

  return config ? (
    <EuiTourStep
      content={<EuiText>{config.description}</EuiText>}
      isStepOpen={isGuidedOnboardingTourOpen}
      maxWidth={350}
      onFinish={() => setIsGuidedOnboardingTourOpen(false)}
      step={1}
      stepsTotal={1}
      title={config.title}
      anchorPosition="rightUp"
      footerAction={
        <EuiButton onClick={() => setIsGuidedOnboardingTourOpen(false)} size="s" color="success">
          {i18n.translate('xpack.fleet.guidedOnboardingTour.nextButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
      }
    >
      {children}
    </EuiTourStep>
  ) : (
    <>{children}</>
  );
};

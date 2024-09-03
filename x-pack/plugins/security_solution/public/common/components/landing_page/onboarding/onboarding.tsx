/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { AVCResultsBanner2024 } from '@kbn/avc-banner';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { TogglePanel } from './toggle_panel';

import { useTogglePanel } from './hooks/use_toggle_panel';
import { Progress } from './progress_bar';
import { StepContextProvider } from './context/step_context';
import { CONTENT_WIDTH } from './helpers';
import { WelcomeHeader } from './welcome_header';
import { Footer } from './footer';
import { useScrollToHash } from './hooks/use_scroll';
import type { SecurityProductTypes } from './configs';
import { ProductLine } from './configs';

import type { StepId } from './types';
import { useOnboardingStyles } from './styles/onboarding.styles';
import { useKibana } from '../../../lib/kibana';
import type { OnboardingHubStepLinkClickedParams } from '../../../lib/telemetry/events/onboarding/types';

interface OnboardingProps {
  indicesExist?: boolean;
  productTypes: SecurityProductTypes | undefined;
  onboardingSteps: StepId[];
  spaceId: string;
}

export const OnboardingComponent: React.FC<OnboardingProps> = ({
  indicesExist,
  productTypes,
  onboardingSteps,
  spaceId,
}) => {
  const {
    onStepClicked,
    toggleTaskCompleteStatus,
    state: {
      activeProducts,
      activeSections,
      finishedSteps,
      totalActiveSteps,
      totalStepsLeft,
      expandedCardSteps,
    },
  } = useTogglePanel({ productTypes, onboardingSteps, spaceId });
  const productTier = useMemo(
    () =>
      productTypes?.find((product) => product.product_line === ProductLine.security)?.product_tier,
    [productTypes]
  );
  const { wrapperStyles, progressSectionStyles, stepsSectionStyles, bannerStyles } =
    useOnboardingStyles();
  const { telemetry, storage } = useKibana().services;
  const onStepLinkClicked = useCallback(
    (params: OnboardingHubStepLinkClickedParams) => {
      telemetry.reportOnboardingHubStepLinkClicked(params);
    },
    [telemetry]
  );

  const [showAVCBanner, setShowAVCBanner] = useState(
    storage.get('securitySolution.showAvcBanner') ?? true
  );
  const onBannerDismiss = useCallback(() => {
    setShowAVCBanner(false);
    storage.set('securitySolution.showAvcBanner', false);
  }, [storage]);

  useScrollToHash();

  return (
    <div className={wrapperStyles}>
      {showAVCBanner && (
        <KibanaPageTemplate.Section paddingSize="none" className={bannerStyles}>
          <AVCResultsBanner2024 onDismiss={onBannerDismiss} />
        </KibanaPageTemplate.Section>
      )}
      <KibanaPageTemplate.Section restrictWidth={CONTENT_WIDTH} paddingSize="xl">
        <WelcomeHeader productTier={productTier} />
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        className={progressSectionStyles}
      >
        <Progress
          totalActiveSteps={totalActiveSteps}
          totalStepsLeft={totalStepsLeft}
          productTier={productTier}
        />
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section
        bottomBorder="extended"
        grow={true}
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        className={stepsSectionStyles}
      >
        <StepContextProvider
          expandedCardSteps={expandedCardSteps}
          finishedSteps={finishedSteps}
          indicesExist={!!indicesExist}
          onStepClicked={onStepClicked}
          onStepLinkClicked={onStepLinkClicked}
          toggleTaskCompleteStatus={toggleTaskCompleteStatus}
        >
          <TogglePanel activeProducts={activeProducts} activeSections={activeSections} />
        </StepContextProvider>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section grow={true} restrictWidth={CONTENT_WIDTH} paddingSize="none">
        <Footer />
      </KibanaPageTemplate.Section>
    </div>
  );
};

export const Onboarding = React.memo(OnboardingComponent);

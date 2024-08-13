/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { AVCResultsBanner2024, useIsStillYear2024 } from '@kbn/avc-banner';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { TogglePanel } from './toggle_panel';

import { useTogglePanel } from './hooks/use_toggle_panel';
import { CardContextProvider } from './context/card_context';
import { CONTENT_WIDTH } from './helpers';
import { WelcomeHeader } from './welcome_header';
import { DataIngestionHubHeader } from './data_ingestion_hub/header';
import { Footer } from './footer';
import { useScrollToHash } from './hooks/use_scroll';
import type { SecurityProductTypes } from './configs';
import { ProductLine } from './configs';

import { useOnboardingStyles } from './styles/onboarding.styles';
import { useKibana } from '../../../lib/kibana';
import type { OnboardingHubStepLinkClickedParams } from '../../../lib/telemetry/events/onboarding/types';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import type { CardId } from './types';

interface OnboardingProps {
  indicesExist?: boolean;
  productTypes: SecurityProductTypes | undefined;
  onboardingSteps: CardId[];
  spaceId: string;
}

export const OnboardingComponent: React.FC<OnboardingProps> = ({
  indicesExist,
  productTypes,
  onboardingSteps,
  spaceId,
}) => {
  const {
    onCardClicked,
    toggleTaskCompleteStatus,
    state: { activeSections, finishedCardIds, expandedCardIds },
  } = useTogglePanel({ onboardingSteps, spaceId });
  const productTier = useMemo(
    () =>
      productTypes?.find((product) => product.product_line === ProductLine.security)?.product_tier,
    [productTypes]
  );
  const { wrapperStyles, stepsSectionStyles, bannerStyles } = useOnboardingStyles();
  const { telemetry, storage } = useKibana().services;
  const onStepLinkClicked = useCallback(
    (params: OnboardingHubStepLinkClickedParams) => {
      telemetry.reportOnboardingHubStepLinkClicked(params);
    },
    [telemetry]
  );
  const isDataIngestionHubEnabled = useIsExperimentalFeatureEnabled('dataIngestionHubEnabled');

  const [showAVCBanner, setShowAVCBanner] = useState(
    storage.get('securitySolution.showAvcBanner') ?? true
  );
  const onBannerDismiss = useCallback(() => {
    setShowAVCBanner(false);
    storage.set('securitySolution.showAvcBanner', false);
  }, [storage]);

  useScrollToHash();

  const renderDataIngestionHubHeader = useMemo(
    () =>
      isDataIngestionHubEnabled ? (
        <DataIngestionHubHeader />
      ) : (
        <WelcomeHeader productTier={productTier} />
      ),
    [isDataIngestionHubEnabled, productTier]
  );

  return (
    <div className={wrapperStyles}>
      {useIsStillYear2024() && showAVCBanner && (
        <KibanaPageTemplate.Section paddingSize="none" className={bannerStyles}>
          <AVCResultsBanner2024 onDismiss={onBannerDismiss} />
        </KibanaPageTemplate.Section>
      )}
      <KibanaPageTemplate.Section restrictWidth={CONTENT_WIDTH} paddingSize="xl">
        {renderDataIngestionHubHeader}
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section
        bottomBorder="extended"
        grow={true}
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        className={stepsSectionStyles}
      >
        <CardContextProvider
          expandedCardIds={expandedCardIds}
          finishedCardIds={finishedCardIds}
          indicesExist={!!indicesExist}
          onCardClicked={onCardClicked}
          onStepLinkClicked={onStepLinkClicked}
          toggleTaskCompleteStatus={toggleTaskCompleteStatus}
        >
          <TogglePanel activeSections={activeSections} />
        </CardContextProvider>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section grow={true} restrictWidth={CONTENT_WIDTH} paddingSize="none">
        <Footer />
      </KibanaPageTemplate.Section>
    </div>
  );
};

export const Onboarding = React.memo(OnboardingComponent);

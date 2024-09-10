/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PluginTemplateWrapper } from '../../common/components/plugin_template_wrapper';
import { CenteredLoadingSpinner } from '../../common/components/centered_loading_spinner';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { OnboardingContextProvider } from './onboarding_context';
import { OnboardingAVCBanner } from './onboarding_avc_banner';
import { OnboardingHeader } from './onboarding_header';
import { OnboardingBody } from './onboarding_body';
import { OnboardingFooter } from './onboarding_footer';

export const OnboardingPage = React.memo(() => {
  const spaceId = useSpaceId();

  if (!spaceId) {
    return (
      <PluginTemplateWrapper>
        <CenteredLoadingSpinner size="l" />
      </PluginTemplateWrapper>
    );
  }

  return (
    <OnboardingContextProvider spaceId={spaceId}>
      <PluginTemplateWrapper paddingSize="none">
        <OnboardingAVCBanner />
        <OnboardingHeader />
        <OnboardingBody />
        <OnboardingFooter />
      </PluginTemplateWrapper>
    </OnboardingContextProvider>
  );
});
OnboardingPage.displayName = 'OnboardingPage';

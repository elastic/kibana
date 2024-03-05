/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import {
  ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability/locators';
import { getRouterLinkProps } from '@kbn/router-utils';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import React from 'react';
import { onboardingLinkTitle } from '../../common/translations';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export const ConnectedOnboardingLink = React.memo(() => {
  const {
    services: {
      share: { url },
    },
  } = useKibanaContextForPlugin();

  return <OnboardingLink urlService={url} />;
});

export const OnboardingLink = React.memo(({ urlService }: { urlService: BrowserUrlService }) => {
  const locator = urlService.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const onboardingUrl = locator?.useUrl({});

  const navigateToOnboarding = () => {
    locator?.navigate({});
  };

  const onboardingLinkProps = getRouterLinkProps({
    href: onboardingUrl,
    onClick: navigateToOnboarding,
  });

  return (
    <EuiButton
      {...onboardingLinkProps}
      fill
      size="s"
      iconType="indexOpen"
      data-test-subj="logsExplorerOnboardingLink"
    >
      {onboardingLinkTitle}
    </EuiButton>
  );
});

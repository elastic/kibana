/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader, EuiButton } from '@elastic/eui';
import {
  ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability';
import { datasetQualityAppTitle, onboardingLinkTitle } from '../../../common/translations';
import { useKibanaContextForPlugin } from '../../utils';

export function Header() {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const OnboardingLink = React.memo(() => {
    const locator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
      OBSERVABILITY_ONBOARDING_LOCATOR
    );

    const onboardingUrl = locator?.getRedirectUrl({});

    return (
      <EuiButton
        href={onboardingUrl}
        fill
        size="s"
        iconType="indexOpen"
        data-test-subj="datasetQualityOnboardingLink"
      >
        {onboardingLinkTitle}
      </EuiButton>
    );
  });

  return (
    <EuiPageHeader
      bottomBorder
      pageTitle={datasetQualityAppTitle}
      rightSideItems={[<OnboardingLink />]}
    />
  );
}

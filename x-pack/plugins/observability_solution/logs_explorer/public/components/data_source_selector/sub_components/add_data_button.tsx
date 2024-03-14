/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { getRouterLinkProps } from '@kbn/router-utils';
import React from 'react';
import { addDataLabel } from '../constants';
import { useKibanaContextForPlugin } from '../../../utils/use_kibana';

export const AddDataButton: React.FunctionComponent<{}> = ({}) => {
  const {
    services: {
      share: { url: urlService },
    },
  } = useKibanaContextForPlugin();
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
    <EuiButtonEmpty
      data-test-subj="logsExplorerAddDataButtonButton"
      {...onboardingLinkProps}
      iconType="plusInCircleFilled"
      size="xs"
    >
      {addDataLabel}
    </EuiButtonEmpty>
  );
};

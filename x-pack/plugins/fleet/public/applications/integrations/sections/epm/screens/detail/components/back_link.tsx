/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

interface Props {
  queryParams: URLSearchParams;
  href: string;
}

export function BackLink({ queryParams, href: integrationsHref }: Props) {
  const { onboardingLink } = useMemo(() => {
    return {
      onboardingLink:
        // Users from Security Solution onboarding page will have onboardingLink to redirect back to the onboarding page
        queryParams.get('observabilityOnboardingLink') || queryParams.get('onboardingLink'),
    };
  }, [queryParams]);
  const href = onboardingLink ?? integrationsHref;
  const message = onboardingLink ? BACK_TO_SELECTION : BACK_TO_INTEGRATIONS;

  return (
    <EuiButtonEmpty iconType="arrowLeft" size="xs" flush="left" href={href}>
      {message}
    </EuiButtonEmpty>
  );
}

const BACK_TO_INTEGRATIONS = (
  <FormattedMessage
    id="xpack.fleet.epm.browseAllButtonText"
    defaultMessage="Back to integrations"
  />
);

const BACK_TO_SELECTION = (
  <FormattedMessage
    id="xpack.fleet.epm.returnToObservabilityOnboarding"
    defaultMessage="Back to selection"
  />
);

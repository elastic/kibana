/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NavigateToAppOptions } from '@kbn/core/public';

export const getCompleteBadgeWithTooltip = ({
  agentStillRequired,
  navigateToApp,
  completeBadgeText,
}: {
  agentStillRequired: boolean;
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>;
  completeBadgeText: string;
}) => {
  return agentStillRequired ? (
    <EuiToolTip
      position="top"
      content={
        <FormattedMessage
          id="xpack.securitySolution.onboarding.integrations.completeBadgeTooltip"
          defaultMessage="Elastic Agent is required for one or more of your integrations."
        />
      }
    >
      <>{completeBadgeText}</>
    </EuiToolTip>
  ) : (
    completeBadgeText
  );
};

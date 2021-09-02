/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';

import { PolicyDetailsForm } from '../policy_details_form';
import { PolicyTrustedAppsLayout } from '../trusted_apps/layout';

export const PolicyTabs = React.memo(() => {
  const tabs = [
    {
      id: 'policyForm',
      name: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.policyForm', {
        defaultMessage: 'Policy settings',
      }),
      content: (
        <>
          <EuiSpacer />
          <PolicyDetailsForm />
        </>
      ),
    },
    {
      id: 'trustedApps',
      name: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.trustedApps', {
        defaultMessage: 'Trusted applications',
      }),
      content: (
        <>
          <EuiSpacer />
          <PolicyTrustedAppsLayout />
        </>
      ),
    },
  ];

  return (
    <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" size="l" />
  );
});

PolicyTabs.displayName = 'PolicyTabs';

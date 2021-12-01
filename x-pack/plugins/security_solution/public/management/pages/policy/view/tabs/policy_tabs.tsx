/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiTabbedContent, EuiSpacer, EuiTabbedContentTab } from '@elastic/eui';

import { usePolicyDetailsSelector } from '../policy_hooks';
import {
  isOnPolicyFormView,
  isOnPolicyTrustedAppsView,
  policyIdFromParams,
} from '../../store/policy_details/selectors';

import { PolicyTrustedAppsLayout } from '../trusted_apps/layout';
import { PolicyFormLayout } from '../policy_forms/components';
import { getPolicyDetailPath, getPolicyTrustedAppsPath } from '../../../../common/routing';

export const PolicyTabs = React.memo(() => {
  const history = useHistory();
  const isInSettingsTab = usePolicyDetailsSelector(isOnPolicyFormView);
  const isInTrustedAppsTab = usePolicyDetailsSelector(isOnPolicyTrustedAppsView);
  const policyId = usePolicyDetailsSelector(policyIdFromParams);

  const tabs = useMemo(
    () => [
      {
        id: 'settings',
        name: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.policyForm', {
          defaultMessage: 'Policy settings',
        }),
        content: (
          <>
            <EuiSpacer />
            <PolicyFormLayout />
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
    ],
    []
  );

  const currentSelectedTab = useMemo(() => {
    let initialTab = tabs[0];

    if (isInSettingsTab) {
      initialTab = tabs[0];
    } else if (isInTrustedAppsTab) {
      initialTab = tabs[1];
    }

    return initialTab;
  }, [isInSettingsTab, isInTrustedAppsTab, tabs]);

  const onTabClickHandler = useCallback(
    (selectedTab: EuiTabbedContentTab) => {
      const path =
        selectedTab.id === 'settings'
          ? getPolicyDetailPath(policyId)
          : getPolicyTrustedAppsPath(policyId);
      history.push(path);
    },
    [history, policyId]
  );

  return (
    <EuiTabbedContent
      tabs={tabs}
      selectedTab={currentSelectedTab}
      size="l"
      onTabClick={onTabClickHandler}
    />
  );
});

PolicyTabs.displayName = 'PolicyTabs';

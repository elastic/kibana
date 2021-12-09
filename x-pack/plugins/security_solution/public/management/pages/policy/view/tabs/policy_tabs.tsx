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
  isOnPolicyEventFiltersView,
  policyIdFromParams,
  policyDetails,
} from '../../store/policy_details/selectors';

import { PolicyTrustedAppsLayout } from '../trusted_apps/layout';
import { PolicyEventFiltersLayout } from '../event_filters/layout';
import { PolicyFormLayout } from '../policy_forms/components';
import {
  getPolicyDetailPath,
  getPolicyTrustedAppsPath,
  getPolicyEventFiltersPath,
} from '../../../../common/routing';

export const PolicyTabs = React.memo(() => {
  const history = useHistory();
  const isInSettingsTab = usePolicyDetailsSelector(isOnPolicyFormView);
  const isInTrustedAppsTab = usePolicyDetailsSelector(isOnPolicyTrustedAppsView);
  const isInEventFilters = usePolicyDetailsSelector(isOnPolicyEventFiltersView);
  const policyId = usePolicyDetailsSelector(policyIdFromParams);
  const policyItem = usePolicyDetailsSelector(policyDetails);

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
      {
        id: 'eventFilters',
        name: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.eventFilters', {
          defaultMessage: 'Event filters',
        }),
        content: (
          <>
            <EuiSpacer />
            <PolicyEventFiltersLayout policyItem={policyItem} />
          </>
        ),
      },
    ],
    [policyItem]
  );

  const currentSelectedTab = useMemo(() => {
    let initialTab = tabs[0];

    if (isInSettingsTab) {
      initialTab = tabs[0];
    } else if (isInTrustedAppsTab) {
      initialTab = tabs[1];
    } else if (isInEventFilters) {
      initialTab = tabs[2];
    }

    return initialTab;
  }, [isInSettingsTab, isInTrustedAppsTab, isInEventFilters, tabs]);

  const onTabClickHandler = useCallback(
    (selectedTab: EuiTabbedContentTab) => {
      const path =
        selectedTab.id === 'settings'
          ? getPolicyDetailPath(policyId)
          : selectedTab.id === 'trustedApps'
          ? getPolicyTrustedAppsPath(policyId)
          : getPolicyEventFiltersPath(policyId);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import {
  getPolicyDetailPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyTrustedAppsPath,
} from '../../../../common/routing';
import {
  isOnHostIsolationExceptionsView,
  isOnPolicyFormView,
  isOnPolicyTrustedAppsView,
  policyIdFromParams,
} from '../../store/policy_details/selectors';
import { PolicyHostIsolationExceptionsTab } from '../host_isolation_exceptions/host_isolation_exceptions_tab';
import { PolicyFormLayout } from '../policy_forms/components';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { PolicyTrustedAppsLayout } from '../trusted_apps/layout';

export const PolicyTabs = React.memo(() => {
  const history = useHistory();
  const isInSettingsTab = usePolicyDetailsSelector(isOnPolicyFormView);
  const isInTrustedAppsTab = usePolicyDetailsSelector(isOnPolicyTrustedAppsView);
  const isInHostIsolationExceptionsTab = usePolicyDetailsSelector(isOnHostIsolationExceptionsView);
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
      {
        id: 'hostIsolationExceptions',
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.tabs.isInHostIsolationExceptions',
          {
            defaultMessage: 'Host isolation exceptions',
          }
        ),
        content: (
          <>
            <EuiSpacer />
            <PolicyHostIsolationExceptionsTab />
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
    } else if (isInHostIsolationExceptionsTab) {
      initialTab = tabs[2];
    }

    return initialTab;
  }, [isInHostIsolationExceptionsTab, isInSettingsTab, isInTrustedAppsTab, tabs]);

  const onTabClickHandler = useCallback(
    (selectedTab: EuiTabbedContentTab) => {
      let path: string = '';
      switch (selectedTab.id) {
        case 'settings':
          path = getPolicyDetailPath(policyId);
          break;
        case 'trustedApps':
          path = getPolicyTrustedAppsPath(policyId);
          break;
        case 'hostIsolationExceptions':
          path = getPolicyHostIsolationExceptionsPath(policyId);
      }
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

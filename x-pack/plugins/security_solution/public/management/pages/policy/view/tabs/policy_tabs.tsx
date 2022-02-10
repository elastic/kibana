/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { PolicyData } from '../../../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import {
  getPolicyDetailPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyTrustedAppsPath,
} from '../../../../common/routing';
import { ManagementPageLoader } from '../../../../components/management_page_loader';
import { useFetchHostIsolationExceptionsList } from '../../../host_isolation_exceptions/view/hooks';
import {
  isOnHostIsolationExceptionsView,
  isOnPolicyEventFiltersView,
  isOnPolicyFormView,
  isOnPolicyTrustedAppsView,
  policyDetails,
  policyIdFromParams,
} from '../../store/policy_details/selectors';
import { PolicyEventFiltersLayout } from '../event_filters/layout';
import { PolicyHostIsolationExceptionsTab } from '../host_isolation_exceptions/host_isolation_exceptions_tab';
import { PolicyFormLayout } from '../policy_forms/components';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { PolicyTrustedAppsLayout } from '../trusted_apps/layout';

const enum PolicyTabKeys {
  SETTINGS = 'settings',
  TRUSTED_APPS = 'trustedApps',
  EVENT_FILTERS = 'eventFilters',
  HOST_ISOLATION_EXCEPTIONS = 'hostIsolationExceptions',
}

interface PolicyTab {
  id: PolicyTabKeys;
  name: string;
  content: React.ReactNode;
}

export const PolicyTabs = React.memo(() => {
  const history = useHistory();
  const isInSettingsTab = usePolicyDetailsSelector(isOnPolicyFormView);
  const isInTrustedAppsTab = usePolicyDetailsSelector(isOnPolicyTrustedAppsView);
  const isInEventFilters = usePolicyDetailsSelector(isOnPolicyEventFiltersView);
  const isInHostIsolationExceptionsTab = usePolicyDetailsSelector(isOnHostIsolationExceptionsView);
  const policyId = usePolicyDetailsSelector(policyIdFromParams);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const privileges = useUserPrivileges().endpointPrivileges;

  const allPolicyHostIsolationExceptionsListRequest = useFetchHostIsolationExceptionsList({
    page: 1,
    perPage: 100,
    policies: [policyId, 'all'],
    // only enable if privileges are not loading and can not isolate a host
    enabled: !privileges.loading && !privileges.canIsolateHost,
  });

  const canSeeHostIsolationExceptions =
    privileges.canIsolateHost ||
    (allPolicyHostIsolationExceptionsListRequest.isFetched &&
      allPolicyHostIsolationExceptionsListRequest.data?.total !== 0);

  // move the use out of this route if they can't access it
  useEffect(() => {
    if (isInHostIsolationExceptionsTab && !canSeeHostIsolationExceptions) {
      history.replace(getPolicyDetailPath(policyId));
    }
  }, [canSeeHostIsolationExceptions, history, isInHostIsolationExceptionsTab, policyId]);

  const tabs: Record<PolicyTabKeys, PolicyTab | undefined> = useMemo(() => {
    return {
      [PolicyTabKeys.SETTINGS]: {
        id: PolicyTabKeys.SETTINGS,
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
      [PolicyTabKeys.TRUSTED_APPS]: {
        id: PolicyTabKeys.TRUSTED_APPS,
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
      [PolicyTabKeys.EVENT_FILTERS]: {
        id: PolicyTabKeys.EVENT_FILTERS,
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
      [PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS]: canSeeHostIsolationExceptions
        ? {
            id: PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.isInHostIsolationExceptions',
              {
                defaultMessage: 'Host isolation exceptions',
              }
            ),
            content: (
              <>
                <EuiSpacer />
                <PolicyHostIsolationExceptionsTab policy={policyItem as PolicyData} />
              </>
            ),
          }
        : undefined,
    };
  }, [canSeeHostIsolationExceptions, policyItem]);

  // convert tabs object into an array EuiTabbedContent can understand
  const tabsList: PolicyTab[] = useMemo(
    () => Object.values(tabs).filter((tab): tab is PolicyTab => tab !== undefined),
    [tabs]
  );

  const currentSelectedTab = useMemo(() => {
    const defaultTab = tabs[PolicyTabKeys.SETTINGS];
    let selectedTab: PolicyTab | undefined;

    if (isInSettingsTab) {
      selectedTab = tabs[PolicyTabKeys.SETTINGS];
    } else if (isInTrustedAppsTab) {
      selectedTab = tabs[PolicyTabKeys.TRUSTED_APPS];
    } else if (isInEventFilters) {
      selectedTab = tabs[PolicyTabKeys.EVENT_FILTERS];
    } else if (isInHostIsolationExceptionsTab) {
      selectedTab = tabs[PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS];
    }

    return selectedTab || defaultTab;
  }, [tabs, isInSettingsTab, isInTrustedAppsTab, isInEventFilters, isInHostIsolationExceptionsTab]);

  const onTabClickHandler = useCallback(
    (selectedTab: EuiTabbedContentTab) => {
      let path: string = '';
      switch (selectedTab.id) {
        case PolicyTabKeys.SETTINGS:
          path = getPolicyDetailPath(policyId);
          break;
        case PolicyTabKeys.TRUSTED_APPS:
          path = getPolicyTrustedAppsPath(policyId);
          break;
        case PolicyTabKeys.EVENT_FILTERS:
          path = getPolicyEventFiltersPath(policyId);
          break;
        case PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS:
          path = getPolicyHostIsolationExceptionsPath(policyId);
          break;
      }
      history.push(path);
    },
    [history, policyId]
  );

  // show loader for privileges validation
  if (
    isInHostIsolationExceptionsTab &&
    (privileges.loading || allPolicyHostIsolationExceptionsListRequest.isLoading)
  ) {
    return <ManagementPageLoader data-test-subj="policyHostIsolationExceptionsTabLoading" />;
  }

  return (
    <EuiTabbedContent
      tabs={tabsList}
      selectedTab={currentSelectedTab}
      size="l"
      onTabClick={onTabClickHandler}
    />
  );
});

PolicyTabs.displayName = 'PolicyTabs';

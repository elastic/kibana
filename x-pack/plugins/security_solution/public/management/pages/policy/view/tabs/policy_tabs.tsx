/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import {
  getPolicyDetailPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyTrustedAppsPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getTrustedAppsListPath,
  getPolicyDetailsArtifactsListPath,
  getBlocklistsListPath,
  getPolicyBlocklistsPath,
} from '../../../../common/routing';
import { useHttp } from '../../../../../common/lib/kibana';
import { ManagementPageLoader } from '../../../../components/management_page_loader';
import { useFetchHostIsolationExceptionsList } from '../../../host_isolation_exceptions/view/hooks';
import {
  isOnHostIsolationExceptionsView,
  isOnPolicyEventFiltersView,
  isOnPolicyFormView,
  isOnPolicyTrustedAppsView,
  isOnBlocklistsView,
  policyDetails,
  policyIdFromParams,
} from '../../store/policy_details/selectors';
import { PolicyArtifactsLayout } from '../artifacts/layout/policy_artifacts_layout';
import { PolicyFormLayout } from '../policy_forms/components';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { POLICY_ARTIFACT_EVENT_FILTERS_LABELS } from './event_filters_translations';
import { POLICY_ARTIFACT_TRUSTED_APPS_LABELS } from './trusted_apps_translations';
import { POLICY_ARTIFACT_HOST_ISOLATION_EXCEPTIONS_LABELS } from './host_isolation_exceptions_translations';
import { POLICY_ARTIFACT_BLOCKLISTS_LABELS } from './blocklists_translations';
import { TrustedAppsApiClient } from '../../../trusted_apps/service/api_client';
import { EventFiltersApiClient } from '../../../event_filters/service/event_filters_api_client';
import { BlocklistsApiClient } from '../../../blocklist/services/blocklists_api_client';
import { HostIsolationExceptionsApiClient } from '../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { SEARCHABLE_FIELDS as TRUSTED_APPS_SEARCHABLE_FIELDS } from '../../../trusted_apps/constants';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../event_filters/constants';
import { SEARCHABLE_FIELDS as HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../host_isolation_exceptions/constants';
import { SEARCHABLE_FIELDS as BLOCKLISTS_SEARCHABLE_FIELDS } from '../../../blocklist/constants';

const enum PolicyTabKeys {
  SETTINGS = 'settings',
  TRUSTED_APPS = 'trustedApps',
  EVENT_FILTERS = 'eventFilters',
  HOST_ISOLATION_EXCEPTIONS = 'hostIsolationExceptions',
  BLOCKLISTS = 'blocklists',
}

interface PolicyTab {
  id: PolicyTabKeys;
  name: string;
  content: React.ReactNode;
}

export const PolicyTabs = React.memo(() => {
  const history = useHistory();
  const http = useHttp();
  const isInSettingsTab = usePolicyDetailsSelector(isOnPolicyFormView);
  const isInTrustedAppsTab = usePolicyDetailsSelector(isOnPolicyTrustedAppsView);
  const isInEventFilters = usePolicyDetailsSelector(isOnPolicyEventFiltersView);
  const isInHostIsolationExceptionsTab = usePolicyDetailsSelector(isOnHostIsolationExceptionsView);
  const isInBlocklistsTab = usePolicyDetailsSelector(isOnBlocklistsView);
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

  const getTrustedAppsApiClientInstance = useCallback(
    () => TrustedAppsApiClient.getInstance(http),
    [http]
  );

  const getEventFiltersApiClientInstance = useCallback(
    () => EventFiltersApiClient.getInstance(http),
    [http]
  );

  const getHostIsolationExceptionsApiClientInstance = useCallback(
    () => HostIsolationExceptionsApiClient.getInstance(http),
    [http]
  );

  const getBlocklistsApiClientInstance = useCallback(
    () => BlocklistsApiClient.getInstance(http),
    [http]
  );

  const tabs: Record<PolicyTabKeys, PolicyTab | undefined> = useMemo(() => {
    const trustedAppsLabels = {
      ...POLICY_ARTIFACT_TRUSTED_APPS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.trustedApps.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} trusted {count, plural, =1 {application} other {applications}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const eventFiltersLabels = {
      ...POLICY_ARTIFACT_EVENT_FILTERS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.eventFilters.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} event {count, plural, =1 {filter} other {filters}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const hostIsolationExceptionsLabels = {
      ...POLICY_ARTIFACT_HOST_ISOLATION_EXCEPTIONS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} host isolation {count, plural, =1 {exception} other {exceptions}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

    const blocklistsLabels = {
      ...POLICY_ARTIFACT_BLOCKLISTS_LABELS,
      layoutAboutMessage: (count: number, link: React.ReactElement): React.ReactNode => (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.blocklists.list.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} {count, plural, =1 {blocklist} other {blocklist entries}} associated with this policy. Click here to {link}"
          values={{ count, link }}
        />
      ),
    };

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
            <PolicyArtifactsLayout
              policyItem={policyItem}
              labels={trustedAppsLabels}
              getExceptionsListApiClient={getTrustedAppsApiClientInstance}
              searchableFields={TRUSTED_APPS_SEARCHABLE_FIELDS}
              getArtifactPath={getTrustedAppsListPath}
              getPolicyArtifactsPath={getPolicyDetailsArtifactsListPath}
            />
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
            <PolicyArtifactsLayout
              policyItem={policyItem}
              labels={eventFiltersLabels}
              getExceptionsListApiClient={getEventFiltersApiClientInstance}
              searchableFields={EVENT_FILTERS_SEARCHABLE_FIELDS}
              getArtifactPath={getEventFiltersListPath}
              getPolicyArtifactsPath={getPolicyEventFiltersPath}
            />
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
                <PolicyArtifactsLayout
                  policyItem={policyItem}
                  labels={hostIsolationExceptionsLabels}
                  getExceptionsListApiClient={getHostIsolationExceptionsApiClientInstance}
                  searchableFields={HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS}
                  getArtifactPath={getHostIsolationExceptionsListPath}
                  getPolicyArtifactsPath={getPolicyHostIsolationExceptionsPath}
                  externalPrivileges={privileges.canIsolateHost}
                />
              </>
            ),
          }
        : undefined,
      [PolicyTabKeys.BLOCKLISTS]: {
        id: PolicyTabKeys.BLOCKLISTS,
        name: i18n.translate('xpack.securitySolution.endpoint.policy.details.tabs.blocklists', {
          defaultMessage: 'Blocklist',
        }),
        content: (
          <>
            <EuiSpacer />
            <PolicyArtifactsLayout
              policyItem={policyItem}
              labels={blocklistsLabels}
              getExceptionsListApiClient={getBlocklistsApiClientInstance}
              searchableFields={BLOCKLISTS_SEARCHABLE_FIELDS}
              getArtifactPath={getBlocklistsListPath}
              getPolicyArtifactsPath={getPolicyBlocklistsPath}
            />
          </>
        ),
      },
    };
  }, [
    canSeeHostIsolationExceptions,
    getEventFiltersApiClientInstance,
    getHostIsolationExceptionsApiClientInstance,
    getBlocklistsApiClientInstance,
    getTrustedAppsApiClientInstance,
    policyItem,
    privileges.canIsolateHost,
  ]);

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
    } else if (isInBlocklistsTab) {
      selectedTab = tabs[PolicyTabKeys.BLOCKLISTS];
    }

    return selectedTab || defaultTab;
  }, [
    tabs,
    isInSettingsTab,
    isInTrustedAppsTab,
    isInEventFilters,
    isInHostIsolationExceptionsTab,
    isInBlocklistsTab,
  ]);

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
        case PolicyTabKeys.BLOCKLISTS:
          path = getPolicyBlocklistsPath(policyId);
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

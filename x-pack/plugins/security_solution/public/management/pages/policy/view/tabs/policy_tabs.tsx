/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
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
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
import { ManagementPageLoader } from '../../../../components/management_page_loader';
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
import { EventFiltersApiClient } from '../../../event_filters/service/api_client';
import { BlocklistsApiClient } from '../../../blocklist/services/blocklists_api_client';
import { HostIsolationExceptionsApiClient } from '../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { SEARCHABLE_FIELDS as TRUSTED_APPS_SEARCHABLE_FIELDS } from '../../../trusted_apps/constants';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../event_filters/constants';
import { SEARCHABLE_FIELDS as HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../host_isolation_exceptions/constants';
import { SEARCHABLE_FIELDS as BLOCKLISTS_SEARCHABLE_FIELDS } from '../../../blocklist/constants';
import type { PolicyDetailsRouteState } from '../../../../../../common/endpoint/types';

enum PolicyTabKeys {
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
  const toasts = useToasts();

  const isInSettingsTab = usePolicyDetailsSelector(isOnPolicyFormView);
  const isInTrustedAppsTab = usePolicyDetailsSelector(isOnPolicyTrustedAppsView);
  const isInEventFiltersTab = usePolicyDetailsSelector(isOnPolicyEventFiltersView);
  const isInHostIsolationExceptionsTab = usePolicyDetailsSelector(isOnHostIsolationExceptionsView);
  const isInBlocklistsTab = usePolicyDetailsSelector(isOnBlocklistsView);
  const policyId = usePolicyDetailsSelector(policyIdFromParams);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const {
    canReadTrustedApplications,
    canWriteTrustedApplications,
    canReadEventFilters,
    canWriteEventFilters,
    canReadHostIsolationExceptions,
    canWriteHostIsolationExceptions,
    canReadBlocklist,
    canWriteBlocklist,
    loading: privilegesLoading,
  } = useUserPrivileges().endpointPrivileges;
  const { state: routeState = {} } = useLocation<PolicyDetailsRouteState>();

  // move the user out of this route if they can't access it
  useEffect(() => {
    if (
      (isInTrustedAppsTab && !canReadTrustedApplications) ||
      (isInEventFiltersTab && !canReadEventFilters) ||
      (isInHostIsolationExceptionsTab && !canReadHostIsolationExceptions) ||
      (isInBlocklistsTab && !canReadBlocklist)
    ) {
      history.replace(getPolicyDetailPath(policyId));
      toasts.addDanger(
        i18n.translate('xpack.securitySolution.policyDetails.missingArtifactAccess', {
          defaultMessage:
            'You do not have the required Kibana permissions to use the given artifact.',
        })
      );
    }
  }, [
    canReadBlocklist,
    canReadEventFilters,
    canReadHostIsolationExceptions,
    canReadTrustedApplications,
    history,
    isInBlocklistsTab,
    isInEventFiltersTab,
    isInHostIsolationExceptionsTab,
    isInTrustedAppsTab,
    policyId,
    toasts,
  ]);

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
          id="xpack.securitySolution.endpoint.policy.blocklist.list.about"
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
      [PolicyTabKeys.TRUSTED_APPS]: canReadTrustedApplications
        ? {
            id: PolicyTabKeys.TRUSTED_APPS,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.trustedApps',
              {
                defaultMessage: 'Trusted applications',
              }
            ),
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
                  canWriteArtifact={canWriteTrustedApplications}
                />
              </>
            ),
          }
        : undefined,
      [PolicyTabKeys.EVENT_FILTERS]: canReadEventFilters
        ? {
            id: PolicyTabKeys.EVENT_FILTERS,
            name: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.tabs.eventFilters',
              {
                defaultMessage: 'Event filters',
              }
            ),
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
                  canWriteArtifact={canWriteEventFilters}
                />
              </>
            ),
          }
        : undefined,
      [PolicyTabKeys.HOST_ISOLATION_EXCEPTIONS]: canReadHostIsolationExceptions
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
                  canWriteArtifact={canWriteHostIsolationExceptions}
                />
              </>
            ),
          }
        : undefined,
      [PolicyTabKeys.BLOCKLISTS]: canReadBlocklist
        ? {
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
                  canWriteArtifact={canWriteBlocklist}
                />
              </>
            ),
          }
        : undefined,
    };
  }, [
    canReadTrustedApplications,
    canWriteTrustedApplications,
    canReadEventFilters,
    canWriteEventFilters,
    canReadHostIsolationExceptions,
    canWriteHostIsolationExceptions,
    canReadBlocklist,
    canWriteBlocklist,
    getEventFiltersApiClientInstance,
    getHostIsolationExceptionsApiClientInstance,
    getBlocklistsApiClientInstance,
    getTrustedAppsApiClientInstance,
    policyItem,
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
    } else if (isInEventFiltersTab) {
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
    isInEventFiltersTab,
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
      history.push(path, routeState?.backLink ? { backLink: routeState.backLink } : null);
    },
    [history, policyId, routeState]
  );

  // show loader for privileges validation
  if (privilegesLoading) {
    return <ManagementPageLoader data-test-subj="privilegesLoading" />;
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

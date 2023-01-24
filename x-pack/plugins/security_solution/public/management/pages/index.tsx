/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Switch, Redirect } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_EVENT_FILTERS_PATH,
  MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
  MANAGEMENT_ROUTING_BLOCKLIST_PATH,
  MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { EndpointsContainer } from './endpoint_hosts';
import { PolicyContainer } from './policy';
import { TrustedAppsContainer } from './trusted_apps';
import { MANAGEMENT_PATH, SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { EventFiltersContainer } from './event_filters';
import { getEndpointListPath } from '../common/routing';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { HostIsolationExceptionsContainer } from './host_isolation_exceptions';
import { BlocklistContainer } from './blocklist';
import { ResponseActionsContainer } from './response_actions';
import { PrivilegedRoute } from '../components/privileged_route';

const EndpointTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.endpoints}>
    <EndpointsContainer />
    <SpyRoute pageName={SecurityPageName.endpoints} />
  </TrackApplicationView>
);

const PolicyTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.policies}>
    <PolicyContainer />
    <SpyRoute pageName={SecurityPageName.policies} />
  </TrackApplicationView>
);

const TrustedAppTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.trustedApps}>
    <TrustedAppsContainer />
    <SpyRoute pageName={SecurityPageName.trustedApps} />
  </TrackApplicationView>
);

const EventFilterTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.eventFilters}>
    <EventFiltersContainer />
    <SpyRoute pageName={SecurityPageName.eventFilters} />
  </TrackApplicationView>
);

const HostIsolationExceptionsTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.hostIsolationExceptions}>
    <HostIsolationExceptionsContainer />
    <SpyRoute pageName={SecurityPageName.hostIsolationExceptions} />
  </TrackApplicationView>
);

const ResponseActionsTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.responseActionsHistory}>
    <ResponseActionsContainer />
    <SpyRoute pageName={SecurityPageName.responseActionsHistory} />
  </TrackApplicationView>
);

export const ManagementContainer = memo(() => {
  const {
    loading,
    canReadPolicyManagement,
    canReadBlocklist,
    canReadTrustedApplications,
    canReadEventFilters,
    canReadActionsLogManagement,
    canReadEndpointList,
    canReadHostIsolationExceptions,
  } = useUserPrivileges().endpointPrivileges;

  // Lets wait until we can verify permissions
  if (loading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <Switch>
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_ENDPOINTS_PATH}
        component={EndpointTelemetry}
        hasPrivilege={canReadEndpointList}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_POLICIES_PATH}
        component={PolicyTelemetry}
        hasPrivilege={canReadPolicyManagement}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_TRUSTED_APPS_PATH}
        component={TrustedAppTelemetry}
        hasPrivilege={canReadTrustedApplications}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_EVENT_FILTERS_PATH}
        component={EventFilterTelemetry}
        hasPrivilege={canReadEventFilters}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH}
        component={HostIsolationExceptionsTelemetry}
        hasPrivilege={canReadHostIsolationExceptions}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_BLOCKLIST_PATH}
        component={BlocklistContainer}
        hasPrivilege={canReadBlocklist}
      />
      <PrivilegedRoute
        path={MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH}
        component={ResponseActionsTelemetry}
        hasPrivilege={canReadActionsLogManagement}
      />

      {canReadEndpointList && (
        <Route path={MANAGEMENT_PATH} exact>
          <Redirect to={getEndpointListPath({ name: 'endpointList' })} />
        </Route>
      )}
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

ManagementContainer.displayName = 'ManagementContainer';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_EVENT_FILTERS_PATH,
  MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
  MANAGEMENT_ROUTING_BLOCKLIST_PATH,
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
import { NoPermissions } from '../components/no_permissons';

const EndpointTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.endpoints}>
    <EndpointsContainer />
  </TrackApplicationView>
);

const PolicyTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.policies}>
    <PolicyContainer />
  </TrackApplicationView>
);

const TrustedAppTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.trustedApps}>
    <TrustedAppsContainer />
  </TrackApplicationView>
);

const EventFilterTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.eventFilters}>
    <EventFiltersContainer />
  </TrackApplicationView>
);

const HostIsolationExceptionsTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.hostIsolationExceptions}>
    <SpyRoute pageName={SecurityPageName.administration} />
    <HostIsolationExceptionsContainer />
  </TrackApplicationView>
);

export const ManagementContainer = memo(() => {
  const { loading, canAccessEndpointManagement } = useUserPrivileges().endpointPrivileges;

  // Lets wait until we can verify permissions
  if (loading) {
    return <EuiLoadingSpinner />;
  }

  if (!canAccessEndpointManagement) {
    return (
      <>
        <Route path="*" component={NoPermissions} />
        <SpyRoute pageName={SecurityPageName.administration} />
      </>
    );
  }

  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_ENDPOINTS_PATH} component={EndpointTelemetry} />
      <Route path={MANAGEMENT_ROUTING_POLICIES_PATH} component={PolicyTelemetry} />
      <Route path={MANAGEMENT_ROUTING_TRUSTED_APPS_PATH} component={TrustedAppTelemetry} />
      <Route path={MANAGEMENT_ROUTING_EVENT_FILTERS_PATH} component={EventFilterTelemetry} />
      <Route
        path={MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH}
        component={HostIsolationExceptionsTelemetry}
      />
      <Route path={MANAGEMENT_ROUTING_BLOCKLIST_PATH} component={BlocklistContainer} />
      <Route path={MANAGEMENT_PATH} exact>
        <Redirect to={getEndpointListPath({ name: 'endpointList' })} />
      </Route>
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

ManagementContainer.displayName = 'ManagementContainer';

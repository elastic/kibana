/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { memo } from 'react';
import { PackageCustomExtensionComponentProps } from '../../../../../../../../fleet/public';
import { FleetEventFiltersCard } from './components/fleet_event_filters_card';
import { FleetHostIsolationExceptionsCard } from './components/fleet_host_isolation_exceptions_card';
import { FleetTrustedAppsCardWrapper } from './components/fleet_trusted_apps_card_wrapper';

export const EndpointPackageCustomExtension = memo<PackageCustomExtensionComponentProps>(
  (props) => {
    return (
      <div data-test-subj="fleetEndpointPackageCustomContent">
        <FleetTrustedAppsCardWrapper {...props} />
        <EuiSpacer />
        <FleetEventFiltersCard {...props} />
        <EuiSpacer />
        <FleetHostIsolationExceptionsCard {...props} />
      </div>
    );
  }
);

EndpointPackageCustomExtension.displayName = 'EndpointPackageCustomExtension';

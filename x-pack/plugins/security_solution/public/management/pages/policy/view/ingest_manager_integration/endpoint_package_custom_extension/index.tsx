/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { memo } from 'react';
import { PackageCustomExtensionComponentProps } from '../../../../../../../../fleet/public';
import { FleetTrustedAppsCard } from './components/fleet_trusted_apps_card';
import { FleetEventFiltersCard } from './components/fleet_event_filters_card';

export const EndpointPackageCustomExtension = memo<PackageCustomExtensionComponentProps>(
  (props) => {
    return (
      <div data-test-subj="fleetEndpointPackageCustomContent">
        <FleetTrustedAppsCard {...props} />
        <EuiSpacer />
        <FleetEventFiltersCard {...props} />
      </div>
    );
  }
);

EndpointPackageCustomExtension.displayName = 'EndpointPackageCustomExtension';

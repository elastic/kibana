/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import routes from 'ui/routes';

import { registerSettingsComponent, PAGE_FOOTER_COMPONENT } from 'ui/management';
import { TelemetryOptInProvider } from '../../services/telemetry_opt_in';
import { TelemetryForm } from '../../components';

routes.defaults(/\/management/, {
  resolve: {
    telemetryManagementSection: function (Private) {
      const telemetryOptInProvider = Private(TelemetryOptInProvider);
      const Component = (props) => <TelemetryForm telemetryOptInProvider={telemetryOptInProvider} {...props} />;

      registerSettingsComponent(PAGE_FOOTER_COMPONENT, Component, true);
    }
  }
});

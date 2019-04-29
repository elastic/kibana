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
    telemetryManagementSection: function (Private, spacesEnabled, activeSpace) {
      const telemetryOptInProvider = Private(TelemetryOptInProvider);

      const spaceProps = {
        spacesEnabled,
      };

      if (spacesEnabled) {
        spaceProps.activeSpace = activeSpace ? activeSpace.space : null;
      }

      const Component = (props) => (
        <TelemetryForm
          spacesEnabled={spacesEnabled}
          telemetryOptInProvider={telemetryOptInProvider}
          {...spaceProps}
          {...props}
        />
      );

      registerSettingsComponent(PAGE_FOOTER_COMPONENT, Component, true);
    }
  }
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Services } from '../../services';
import { TelemetryContextProvider } from './telemetry';
import { CreateIntegrationLanding } from './create_integration_landing';
import { CreateIntegrationUpload } from './create_integration_upload';
import { CreateIntegrationAssistant } from './create_integration_assistant';
import { Page, PagePath } from '../../common/constants';
import { useRoutesAuthorization } from '../../common/hooks/use_authorization';

interface CreateIntegrationProps {
  services: Services;
}
export const CreateIntegration = React.memo<CreateIntegrationProps>(({ services }) => (
  <KibanaContextProvider services={services}>
    <TelemetryContextProvider>
      <CreateIntegrationRouter />
    </TelemetryContextProvider>
  </KibanaContextProvider>
));

CreateIntegration.displayName = 'CreateIntegration';

const CreateIntegrationRouter = React.memo(() => {
  const { canUseIntegrationAssistant, canUseIntegrationUpload } = useRoutesAuthorization();

  return (
    <Switch>
      {canUseIntegrationAssistant && (
        <Route path={PagePath[Page.assistant]} component={CreateIntegrationAssistant} />
      )}
      {canUseIntegrationUpload && (
        <Route path={PagePath[Page.upload]} component={CreateIntegrationUpload} />
      )}
      <Route path={PagePath[Page.landing]} component={CreateIntegrationLanding} />
    </Switch>
  );
});
CreateIntegrationRouter.displayName = 'CreateIntegrationRouter';

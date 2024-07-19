/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect, Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Services } from '../../services';
import { TelemetryContextProvider } from './telemetry';
import { IntegrationImportLanding } from './integration_import_landing';
import { IntegrationImportUpload } from './integration_import_upload';
import { IntegrationAutoImport } from './integration_auto_import';
import { Page, PagePath } from '../../common/constants';
import { useRoutesAuthorization } from '../../common/hooks/use_authorization';
import { useIsAvailable } from '../../common/hooks/use_availability';

interface IntegrationImportProps {
  services: Services;
}
export const IntegrationImport = React.memo<IntegrationImportProps>(({ services }) => (
  <KibanaContextProvider services={services}>
    <TelemetryContextProvider>
      <CreateIntegrationRouter />
    </TelemetryContextProvider>
  </KibanaContextProvider>
));
IntegrationImport.displayName = 'IntegrationImport';

const CreateIntegrationRouter = React.memo(() => {
  const { canUseIntegrationImport, canUseIntegrationUpload } = useRoutesAuthorization();
  const isAvailable = useIsAvailable();
  return (
    <Switch>
      {isAvailable && canUseIntegrationImport && (
        <Route path={PagePath[Page.autoImport]} exact component={IntegrationAutoImport} />
      )}
      {isAvailable && canUseIntegrationUpload && (
        <Route path={PagePath[Page.upload]} exact component={IntegrationImportUpload} />
      )}

      <Route path={PagePath[Page.landing]} exact component={IntegrationImportLanding} />

      <Route render={() => <Redirect to={PagePath[Page.landing]} />} />
    </Switch>
  );
});
CreateIntegrationRouter.displayName = 'CreateIntegrationRouter';

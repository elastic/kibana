/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { CreateIntegrationLanding } from './create_integration_landing';
import { CreateIntegrationUpload } from './create_integration_upload';
import { CreateIntegrationAssistant } from './create_integration_assistant';

export const CreateIntegration = React.memo(() => {
  return (
    <Switch>
      <Route path={'/create/assistant'} component={CreateIntegrationAssistant} />
      <Route path={'/create/upload'} component={CreateIntegrationUpload} />
      <Route path={'/create'} component={CreateIntegrationLanding} />
    </Switch>
  );
});
CreateIntegration.displayName = 'CreateIntegration';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { EditConnector } from './connectors/edit_connector';
import { ConnectorsOverview } from './connectors_overview';
import { ConnectorsElasticManaged } from './connectors_elastic_managed';
import { ELASTIC_MANAGED_CONNECTOR_PATH } from '../constants';

export const ConnectorsRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path={ELASTIC_MANAGED_CONNECTOR_PATH}>
        <ConnectorsElasticManaged />
      </Route>
      <Route exact path={'/:id'}>
        <EditConnector />
      </Route>
      <Route exact path="/">
        <ConnectorsOverview />
      </Route>
    </Routes>
  );
};

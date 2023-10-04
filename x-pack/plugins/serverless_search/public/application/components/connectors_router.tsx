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

export const BASE_CONNECTORS_PATH = 'connectors';
export const CREATE_CONNECTOR_SLUG = `create_connector`;
export const EDIT_CONNECTOR_PATH = `${CREATE_CONNECTOR_SLUG}/:id`;
export const CREATE_CONNECTOR_PATH = `${CREATE_CONNECTOR_SLUG}`;

export const ConnectorsRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={`/${CREATE_CONNECTOR_SLUG}/:id`}>
        <EditConnector />
      </Route>
      <Route exact path="/">
        <ConnectorsOverview />
      </Route>
    </Routes>
  );
};

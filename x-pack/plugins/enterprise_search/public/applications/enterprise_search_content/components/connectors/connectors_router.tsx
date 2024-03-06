/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { NEW_INDEX_SELECT_CONNECTOR_PATH} from '../../routes';
import { SelectConnector } from './select_connector/select_connector';

export const ConnectorsRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={NEW_INDEX_SELECT_CONNECTOR_PATH}>
        <SelectConnector />
      </Route>
    </Routes>
  );
};

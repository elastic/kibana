/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { CONNECTOR_DETAIL_PATH, SEARCH_INDEX_TAB_PATH } from '../../routes';

import { ConnectorDetail } from './connector_detail';

export const ConnectorDetailRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={CONNECTOR_DETAIL_PATH} exact>
        <ConnectorDetail />
      </Route>
      <Route path={SEARCH_INDEX_TAB_PATH}>
        <ConnectorDetail />
      </Route>
    </Routes>
  );
};

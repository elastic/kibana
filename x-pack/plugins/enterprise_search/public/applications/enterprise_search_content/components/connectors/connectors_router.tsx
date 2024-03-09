/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import {
  CONNECTORS_PATH,
  NEW_INDEX_SELECT_CONNECTOR_PATH,
  NEW_CONNECTOR_PATH,
  CONNECTOR_DETAIL_PATH,
} from '../../routes';
import { ConnectorDetailRouter } from '../connector_detail/connector_detail_router';
import { NewSearchIndexPage } from '../new_index/new_search_index_page';

import { Connectors } from './connectors';
import { SelectConnector } from './select_connector/select_connector';

export const ConnectorsRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={NEW_INDEX_SELECT_CONNECTOR_PATH}>
        <SelectConnector />
      </Route>
      <Route path={NEW_CONNECTOR_PATH}>
        <NewSearchIndexPage type="connector" />
      </Route>
      <Route path={CONNECTORS_PATH} exact>
        <Connectors isCrawler={false} />
      </Route>
      <Route path={CONNECTOR_DETAIL_PATH}>
        <ConnectorDetailRouter />
      </Route>
    </Routes>
  );
};

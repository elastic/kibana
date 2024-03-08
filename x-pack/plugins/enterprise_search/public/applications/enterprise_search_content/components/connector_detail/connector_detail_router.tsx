/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { CONNECTOR_DETAIL_PATH, CONNECTOR_DETAIL_TAB_PATH } from '../../routes';

import { IndexNameLogic } from '../search_index/index_name_logic';

import { ConnectorDetail } from './connector_detail';
import { ConnectorViewLogic } from './connector_view_logic';

export const ConnectorDetailRouter: React.FC = () => {
  useEffect(() => {
    const unmountName = IndexNameLogic.mount();
    const unmountView = ConnectorViewLogic.mount();
    return () => {
      unmountName();
      unmountView();
    };
  }, []);
  const { setIndexName } = useActions(IndexNameLogic);
  const { connector } = useValues(ConnectorViewLogic);
  const indexName = connector?.index_name || '';
  useEffect(() => {
    setIndexName(indexName);
  }, [indexName]);
  return (
    <Routes>
      <Route path={CONNECTOR_DETAIL_PATH} exact>
        <ConnectorDetail />
      </Route>
      <Route path={CONNECTOR_DETAIL_TAB_PATH}>
        <ConnectorDetail />
      </Route>
    </Routes>
  );
};

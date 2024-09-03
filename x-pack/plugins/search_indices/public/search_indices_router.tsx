/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { ROOT_PATH, SEARCH_INDICES_DETAILS_PATH } from './routes';
import { SearchIndexDetailsPage } from './components/details_page/details_page';
import { ElasticsearchStartPage } from './components/start/start_page';

export const SearchIndicesRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path={SEARCH_INDICES_DETAILS_PATH} component={SearchIndexDetailsPage}></Route>
      <Route path={ROOT_PATH} component={ElasticsearchStartPage} />
    </Routes>
  );
};

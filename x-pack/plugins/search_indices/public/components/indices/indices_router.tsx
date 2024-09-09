/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { SEARCH_INDICES_DETAILS_PATH } from '../../routes';
import { SearchIndexDetailsPage } from './details_page';
import { useKibana } from '../../hooks/use_kibana';

export const SearchIndicesRouter: React.FC = () => {
  const { application } = useKibana().services;
  return (
    <Routes>
      <Route exact path={SEARCH_INDICES_DETAILS_PATH} component={SearchIndexDetailsPage} />
      <Route render={() => application.navigateToApp('elasticsearchStart')} />
    </Routes>
  );
};

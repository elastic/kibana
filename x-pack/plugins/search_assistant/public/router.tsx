/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { SearchAssistantPage } from './components/search_assistant';

export const SearchAssistantRouter: React.FC = () => {
  return (
    <Routes>
      <Route>
        <SearchAssistantPage />
      </Route>
    </Routes>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { SEARCH_INDICES_PATH, SEARCH_INDEX_PATH, NEW_INDEX_PATH } from '../../routes';

import { NewIndex } from '../new_index';
import { SearchIndexRouter } from '../search_index/search_index_router';

import { SearchIndices } from './search_indices';

export const SearchIndicesRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={NEW_INDEX_PATH} element={<NewIndex />} />
      <Route path={SEARCH_INDICES_PATH} element={<SearchIndices />} />
      <Route path={SEARCH_INDEX_PATH} element={<SearchIndexRouter />} />
    </Routes>
  );
};

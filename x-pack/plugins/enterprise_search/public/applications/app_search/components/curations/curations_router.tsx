/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';

import {
  ENGINE_CURATIONS_PATH,
  ENGINE_CURATIONS_NEW_PATH,
  ENGINE_CURATION_PATH,
  ENGINE_CURATION_SUGGESTION_PATH,
} from '../../routes';

import { Curation } from './curation';
import { Curations, CurationCreation, CurationSuggestion } from './views';

export const CurationsRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={ENGINE_CURATIONS_PATH} element={<Curations />} />
      <Route path={ENGINE_CURATIONS_NEW_PATH} element={<CurationCreation />} />
      <Route path={ENGINE_CURATION_SUGGESTION_PATH} element={<CurationSuggestion />} />
      <Route path={ENGINE_CURATION_PATH} element={<Curation />} />
    </Routes>
  );
};

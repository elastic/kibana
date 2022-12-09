/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { useValues } from 'kea';

import { enableEnginesSection } from '../../../../../common/ui_settings_keys';
import { KibanaLogic } from '../../../shared/kibana';
import { ENGINES_PATH } from '../../routes';

import { NotFound } from '../not_found';

import { EnginesList } from './engines_list';

export const EnginesRouter: React.FC = () => {
  const { uiSettings } = useValues(KibanaLogic);
  const enginesSectionEnabled = uiSettings?.get<boolean>(enableEnginesSection, false);
  if (!enginesSectionEnabled) {
    return (
      <Routes>
        <Route>
          <NotFound />
        </Route>
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path={ENGINES_PATH} element={<EnginesList />} />
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};

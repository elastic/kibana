/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { PlaygroundOverview } from './playground_overview';

import { ROOT_PATH, SEARCH_PLAYGROUND_CHAT_PATH, SEARCH_PLAYGROUND_SEARCH_PATH } from './routes';
import { useKibana } from './hooks/use_kibana';
import { PlaygroundPageMode } from './types';

export const PlaygroundRouter: React.FC = () => {
  const {
    services: { featureFlags },
  } = useKibana();

  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={SEARCH_PLAYGROUND_CHAT_PATH} />
      <Route path={SEARCH_PLAYGROUND_CHAT_PATH}>
        <PlaygroundOverview pageMode={PlaygroundPageMode.chat} />
      </Route>
      {featureFlags.searchPlaygroundEnabled && (
        <Route path={SEARCH_PLAYGROUND_SEARCH_PATH}>
          <PlaygroundOverview pageMode={PlaygroundPageMode.search} />
        </Route>
      )}
    </Routes>
  );
};

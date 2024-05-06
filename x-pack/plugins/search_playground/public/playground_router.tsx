/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { ChatPlaygroundOverview } from './chat_playground_overview';

import { ROOT_PATH, SEARCH_PLAYGROUND_CHAT_PATH } from './routes';

export const PlaygroundRouter: React.FC = () => {
  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={SEARCH_PLAYGROUND_CHAT_PATH} />
      <Route path={SEARCH_PLAYGROUND_CHAT_PATH}>
        <ChatPlaygroundOverview />
      </Route>
    </Routes>
  );
};

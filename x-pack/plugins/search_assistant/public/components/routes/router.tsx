/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { History } from 'history';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { useSearchAIAssistantRouter } from '../../hooks/use_ai_assistant_router';

export const SearchAssistantRouter: React.FC<{ history: History }> = ({ history }) => {
  const router = useSearchAIAssistantRouter();
  return (
    <RouterProvider history={history} router={router}>
      <RouteRenderer />
    </RouterProvider>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENTITY_MANAGER_DETAIL, ENTITY_MANAGER_OVERVIEW } from '../common/locators/paths';
import { EntityManagerPage } from './pages/entity_manager/entity_manager';
import { EntityManagerDetailPage } from './pages/entity_manager_detail/entity_manager_detail';

interface RouteDef {
  [key: string]: {
    handler: () => React.ReactElement;
    params: Record<string, string>;
    exact: boolean;
  };
}

export function getRoutes(): RouteDef {
  return {
    [ENTITY_MANAGER_OVERVIEW]: {
      handler: () => <EntityManagerPage />,
      params: {},
      exact: true,
    },
    [ENTITY_MANAGER_DETAIL]: {
      handler: () => <EntityManagerDetailPage />,
      params: {},
      exact: true,
    },
  };
}

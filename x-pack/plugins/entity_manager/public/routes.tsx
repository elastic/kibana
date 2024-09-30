/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ENTITY_MANAGER_CREATE,
  ENTITY_MANAGER_DETAIL,
  ENTITY_MANAGER_OVERVIEW,
} from '../common/locators/paths';
import {
  EntityManagerCreatePage,
  EntityManagerDetailsPage,
  EntityManagerOverviewPage,
} from './pages/entity_manager';

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
      handler: () => <EntityManagerOverviewPage />,
      params: {},
      exact: true,
    },
    [ENTITY_MANAGER_CREATE]: {
      handler: () => <EntityManagerCreatePage />,
      params: {},
      exact: true,
    },
    [ENTITY_MANAGER_DETAIL]: {
      handler: () => <EntityManagerDetailsPage />,
      params: {},
      exact: true,
    },
  };
}

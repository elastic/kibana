/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import { keyBy } from 'lodash';
import { useMemo } from 'react';
import type { MlRoute } from './router';

export const useActiveRoute = (routesList: MlRoute[]): MlRoute => {
  const { pathname } = useLocation();
  const routesMap = useMemo(() => keyBy(routesList, 'path'), []);

  const activeRoute = useMemo(() => routesMap[pathname], [pathname]);

  return activeRoute ?? routesMap['/overview'];
};

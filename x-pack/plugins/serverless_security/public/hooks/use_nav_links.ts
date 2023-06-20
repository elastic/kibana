/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../services';

export const useNavLinks = () => {
  const { securitySolution } = useKibana().services;
  const { getNavLinks$ } = securitySolution;
  const navLinks$ = useMemo(() => getNavLinks$(), [getNavLinks$]);
  return useObservable(navLinks$, []);
};

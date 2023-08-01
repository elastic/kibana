/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ProjectPageName } from '../../navigation/links/types';
import { useKibana } from '../services';

export const useNavLinks = () => {
  const { getProjectNavLinks$ } = useKibana().services;
  const projectNavLinks$ = useMemo(() => getProjectNavLinks$(), [getProjectNavLinks$]);
  return useObservable(projectNavLinks$, []);
};

export const useNavLink = (id: ProjectPageName) => {
  const projectNavLinks = useNavLinks();
  return useMemo(() => projectNavLinks.find((navLink) => navLink.id === id), [projectNavLinks, id]);
};

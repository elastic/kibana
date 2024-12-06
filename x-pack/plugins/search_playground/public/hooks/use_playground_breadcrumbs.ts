/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from './use_kibana';

export const usePlaygroundBreadcrumbs = () => {
  const { searchNavigation } = useKibana().services;

  useEffect(() => {
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs(
      [{ text: 'Build' }, { text: 'Playground' }],
      { forClassicChromeStyle: true }
    );

    return () => {
      // Clear breadcrumbs on unmount;
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [searchNavigation]);
};

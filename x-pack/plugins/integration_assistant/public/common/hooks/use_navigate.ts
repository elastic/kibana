/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Page } from '../constants';
import { useKibana } from './use_kibana';

export { Page }; // re-export for convenience

const getPathFromPage = (page: Page): string =>
  page === Page.landing ? '/create' : `/create/${page}`;

export const useNavigate = () => {
  const { navigateToApp } = useKibana().services.application;
  const navigateToPage = useCallback(
    (page: Page) => {
      navigateToApp('integrations', { path: getPathFromPage(page) });
    },
    [navigateToApp]
  );
  return navigateToPage;
};

export const usePageUrl = (page: Page) => {
  const { getUrlForApp } = useKibana().services.application;
  return getUrlForApp('integrations', { path: getPathFromPage(page) });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PLUGIN_ID } from '../../../../common/constants/app';

import { useMlKibana } from './kibana_context';

export type NavigateToPath = ReturnType<typeof useNavigateToPath>;

export const useNavigateToPath = () => {
  const {
    services: {
      application: { getUrlForApp, navigateToUrl },
    },
  } = useMlKibana();

  const location = useLocation();

  return useMemo(
    () => (path: string | undefined, preserveSearch = false) => {
      navigateToUrl(
        getUrlForApp(PLUGIN_ID, {
          path: `${path}${preserveSearch === true ? location.search : ''}`,
        })
      );
    },
    [location]
  );
};

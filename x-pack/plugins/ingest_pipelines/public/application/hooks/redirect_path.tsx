/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { useCallback, useMemo } from 'react';

import { useKibana } from '../../shared_imports';

/**
 * This hook allow to redirect to the provided path or using redirect_path if it's provided in the query params.
 */
export function useRedirectPath(history: History) {
  const { services } = useKibana();

  const redirectPath = useMemo(() => {
    const locationSearchParams = new URLSearchParams(history.location.search);

    return locationSearchParams.get('redirect_path');
  }, [history.location.search]);

  return useCallback(
    (path: string) => {
      if (redirectPath) {
        services.application.navigateToUrl(redirectPath);
      } else {
        history.push(path);
      }
    },
    [redirectPath, services.application, history]
  );
}

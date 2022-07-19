/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { History, LocationDescriptor } from 'history';

import { useKibana } from '..';

export function useRedirectPath(history: History) {
  const { services } = useKibana();

  const redirectPath = useMemo(() => {
    const locationSearchParams = new URLSearchParams(history.location.search);

    return locationSearchParams.get('redirect_path');
  }, [history.location.search]);

  return useCallback(
    (location: LocationDescriptor) => {
      if (redirectPath && services.application) {
        services.application.navigateToUrl(redirectPath);
      } else {
        history.push(location);
      }
    },
    [redirectPath, services.application, history]
  );
}

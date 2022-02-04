/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { useUrlParams } from './use_url_params';

// FIXME:PT delete/change once we get the common hook from @parkiino PR
export const useSetUrlParams = (): ((
  params: Record<string, string | number | null | undefined>,
  replace?: boolean
) => void) => {
  const location = useLocation();
  const history = useHistory();
  const { toUrlParams, urlParams: currentUrlParams } = useUrlParams();

  return useCallback(
    (params, replace = false) => {
      history.push({
        ...location,
        search: toUrlParams(replace ? params : { ...currentUrlParams, ...params }),
      });
    },
    [currentUrlParams, history, location, toUrlParams]
  );
};

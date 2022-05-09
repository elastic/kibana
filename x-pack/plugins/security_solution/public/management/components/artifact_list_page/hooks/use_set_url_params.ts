/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { pickBy } from 'lodash';
import { useUrlParams } from '../../hooks/use_url_params';

// FIXME:PT Refactor into a more generic hooks for managing url params
export const useSetUrlParams = (): ((
  /** Any param whose value is `undefined` will be removed from the URl when in append mode */
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
        search: toUrlParams(
          replace
            ? params
            : pickBy({ ...currentUrlParams, ...params }, (value) => value !== undefined)
        ),
      });
    },
    [currentUrlParams, history, location, toUrlParams]
  );
};

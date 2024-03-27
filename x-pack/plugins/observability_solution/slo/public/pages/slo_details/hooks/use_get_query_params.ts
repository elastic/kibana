/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { useHistory, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export const INSTANCE_SEARCH_PARAM = 'instanceId';
export const REMOTE_NAME_PARAM = 'remoteName';
export const DELETE_SLO = 'delete';

export function useGetQueryParams() {
  const { search, pathname } = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(search);

  const instanceId = searchParams.get(INSTANCE_SEARCH_PARAM);
  const remoteName = searchParams.get(REMOTE_NAME_PARAM);
  const deleteSlo = searchParams.get(DELETE_SLO);

  const removeDeleteQueryParam = useCallback(() => {
    const qParams = new URLSearchParams(search);

    // remote delete param from url after initial load
    if (deleteSlo === 'true') {
      qParams.delete(DELETE_SLO);
      history.replace({
        pathname,
        search: qParams.toString(),
      });
    }
  }, [deleteSlo, history, pathname, search]);

  return {
    instanceId: !!instanceId && instanceId !== ALL_VALUE ? instanceId : undefined,
    remoteName,
    isDeletingSlo: deleteSlo === 'true',
    removeDeleteQueryParam,
  };
}

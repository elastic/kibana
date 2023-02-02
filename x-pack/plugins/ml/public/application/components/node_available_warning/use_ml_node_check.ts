/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { HttpService } from '../../services/http_service';
import { mlApiServicesProvider } from '../../services/ml_api_service';

export function useMlNodeCheck() {
  const { http } = useKibana().services;
  const ml = useMemo(() => mlApiServicesProvider(new HttpService(http!)), [http]);
  const [mlNodeCount, setMlNodeCount] = useState<number | null>(null);
  const [lazyMlNodeCount, setLazyMlNodeCount] = useState<number | null>(null);
  const [userHasPermissionToViewMlNodeCount, setUserHasPermissionToViewMlNodeCount] = useState<
    boolean | null
  >(null);
  const [mlNodesAvailable, setMlNodesAvailable] = useState<boolean>(true);

  const checkNodes = useCallback(async () => {
    try {
      const { count, lazyNodeCount } = await ml.mlNodeCount();
      setMlNodeCount(count);
      setLazyMlNodeCount(lazyNodeCount);
      setUserHasPermissionToViewMlNodeCount(true);

      setMlNodesAvailable(count !== 0 || lazyNodeCount !== 0);
    } catch (error) {
      if (error.statusCode === 403) {
        setUserHasPermissionToViewMlNodeCount(false);
        setMlNodesAvailable(true);
      }
    }
  }, [ml]);

  useEffect(
    function checkNodesInit() {
      checkNodes();
    },
    [checkNodes]
  );

  return {
    mlNodeCount,
    lazyMlNodeCount,
    userHasPermissionToViewMlNodeCount,
    mlNodesAvailable,
    refresh: checkNodes,
  };
}

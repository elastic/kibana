/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HttpService } from '../../services/http_service';
import { mlApiProvider } from '../../services/ml_api_service';
import { type CloudInfo, extractDeploymentId } from '../../services/ml_server_info';

export function useMlNodeAvailableCheck() {
  const { mlNodesAvailable } = useMlNodeCheck();
  const { isCloud, deploymentId, isCloudTrial } = useCloudCheck();

  return {
    mlNodesAvailable,
    isCloud,
    deploymentId,
    isCloudTrial,
  };
}

export function useMlNodeCheck() {
  const { http } = useKibana().services;
  const mlApi = useMemo(() => mlApiProvider(new HttpService(http!)), [http]);
  const [mlNodeCount, setMlNodeCount] = useState<number | null>(null);
  const [lazyMlNodeCount, setLazyMlNodeCount] = useState<number | null>(null);
  const [userHasPermissionToViewMlNodeCount, setUserHasPermissionToViewMlNodeCount] = useState<
    boolean | null
  >(null);
  const [mlNodesAvailable, setMlNodesAvailable] = useState<boolean>(true);

  const checkNodes = useCallback(async () => {
    try {
      const { count, lazyNodeCount } = await mlApi.mlNodeCount();
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
  }, [mlApi]);

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

const defaultCloudInfo: CloudInfo = {
  cloudId: null,
  isCloud: false,
  isCloudTrial: false,
  deploymentId: null,
};

export function useCloudCheck() {
  const { http } = useKibana().services;
  const mlApi = useMemo(() => mlApiProvider(new HttpService(http!)), [http]);
  const [cloudInfo, setCloudInfo] = useState<CloudInfo>(defaultCloudInfo);

  const loadInfo = useCallback(async () => {
    try {
      const resp = await mlApi.mlInfo();
      setCloudInfo({
        cloudId: resp.cloudId ?? null,
        isCloud: resp.cloudId !== undefined,
        isCloudTrial: resp.isCloudTrial === true,
        deploymentId: !resp.cloudId ? null : extractDeploymentId(resp.cloudId),
      });
    } catch (error) {
      if (error.statusCode === 403) {
        setCloudInfo(defaultCloudInfo);
      }
    }
  }, [mlApi]);

  useEffect(
    function loadInfoInit() {
      loadInfo();
    },
    [loadInfo]
  );

  return cloudInfo;
}

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
import { type CloudInfo, extractDeploymentId } from '../../services/ml_server_info';

const defaultCloudInfo: CloudInfo = {
  cloudId: null,
  isCloud: false,
  isCloudTrial: false,
  deploymentId: null,
};

export function useCloudCheck() {
  const { http } = useKibana().services;
  const ml = useMemo(() => mlApiServicesProvider(new HttpService(http!)), [http]);
  const [cloudInfo, setCloudInfo] = useState<CloudInfo>(defaultCloudInfo);

  const loadInfo = useCallback(async () => {
    try {
      const resp = await ml.mlInfo();
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
  }, [ml]);

  useEffect(
    function loadInfoInit() {
      loadInfo();
    },
    [loadInfo]
  );

  return cloudInfo;
}

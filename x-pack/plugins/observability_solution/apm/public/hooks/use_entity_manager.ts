/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import { ApmPluginStartDeps } from '../plugin';

export enum ENTITY_FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export function useEntityManager() {
  const {
    services: { entityManager },
  } = useKibana<ApmPluginStartDeps>();

  const [result, setResult] = useState({
    isEnabled: false,
    status: ENTITY_FETCH_STATUS.NOT_INITIATED,
  });

  useEffect(() => {
    async function isManagedEntityDiscoveryEnabled() {
      setResult({ isEnabled: false, status: ENTITY_FETCH_STATUS.LOADING });

      try {
        const response = await entityManager.entityClient.isManagedEntityDiscoveryEnabled();
        setResult({ isEnabled: response?.enabled, status: ENTITY_FETCH_STATUS.SUCCESS });
      } catch (err) {
        setResult({ isEnabled: false, status: ENTITY_FETCH_STATUS.FAILURE });

        console.error(err);
      }
    }

    isManagedEntityDiscoveryEnabled();
  }, [entityManager]);

  return { ...result };
}

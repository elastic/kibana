/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import { ApmPluginStartDeps } from '../plugin';

export function useEntityManager() {
  const {
    services: { entityManager },
  } = useKibana<ApmPluginStartDeps>();
  const [isEntityDiscoveryEnabled, setIsEntityDiscoveryEnabled] = useState(false);

  useEffect(() => {
    async function isManagedEntityDiscoveryEnabled() {
      try {
        const response = await entityManager.entityClient.isManagedEntityDiscoveryEnabled();
        setIsEntityDiscoveryEnabled(response?.enabled);
      } catch (err) {
        setIsEntityDiscoveryEnabled(false);
        console.error(err);
      }
    }

    isManagedEntityDiscoveryEnabled();
  }, [entityManager]);

  return [isEntityDiscoveryEnabled];
}

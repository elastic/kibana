/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import { useKibana } from '../context/kibana_context/use_kibana';

export const useEntityManager = () => {
  const {
    services: { entityManager },
  } = useKibana();

  const { value = { enabled: false } } = useAbortableAsync(() => {
    return entityManager.entityClient.isManagedEntityDiscoveryEnabled();
  }, [entityManager]);

  return {
    isEntityManagerEnabled: value.enabled,
  };
};

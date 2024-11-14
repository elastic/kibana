/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useState } from 'react';
import { useKibana } from './use_kibana';

export const useEntityManager = () => {
  const {
    services: { entityManager },
  } = useKibana();

  const [showWelcomedModal, setWelcomedModal] = useState(false);

  const {
    value = { enabled: false },
    loading,
    refresh,
  } = useAbortableAsync(
    ({ signal }) => {
      return entityManager.entityClient.isManagedEntityDiscoveryEnabled();
    },
    [entityManager]
  );

  return {
    isEntityManagerEnabled: value.enabled,
    isEnablementLoading: loading,
    refresh,
    showWelcomedModal,
    toggleWelcomedModal: () => setWelcomedModal((state) => !state),
  };
};

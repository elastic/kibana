/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useKibana } from './use_kibana';

export const useFetchEntityDefinition = (id: string) => {
  const {
    services: { entityManager },
  } = useKibana();

  const { value, loading } = useAbortableAsync(
    ({ signal }) => {
      return entityManager.entityClient.getEntityDefinition(id);
    },
    [entityManager.entityClient, id]
  );

  return {
    entityDefinitions: value?.definitions,
    isEntityDefinitionLoading: loading,
  };
};

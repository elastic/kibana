/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useKibana } from '../../hooks/use_kibana';

export function EntityView({ entityId, entityType }: { entityId: string; entityType: string }) {
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const {} = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('POST /internal/inventory/views', {
        params: {
          body: {
            entityId,
            entityType,
          },
        },
        signal,
      });
    },
    [entityId, entityType]
  );

  return <></>;
}

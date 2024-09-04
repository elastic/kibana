/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useKibana } from './use_kibana';

export function useListEntitiesFetch({ type }: { type: string }) {
  const {
    core: { notifications },
    services: { inventoryAPIClient },
  } = useKibana();

  const entitiesFetchResult = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient
        .fetch('GET /internal/inventory/entities', {
          signal,
          params: {
            query: { type },
          },
        })
        .catch((error) => {
          if (isRequestAbortedError(error)) {
            return;
          }

          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.inventory.listEntitiesFetch.failedToFetch', {
              defaultMessage: 'Failed to fetch entities',
            }),
          });
          throw error;
        });
    },
    [type, inventoryAPIClient, notifications]
  );

  return entitiesFetchResult;
}

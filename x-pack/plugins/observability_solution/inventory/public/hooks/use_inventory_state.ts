/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { decode, encode } from '@kbn/rison';
import { useInventoryParams } from './use_inventory_params';
import { useInventoryRouter } from './use_inventory_router';
import { EntityView } from '../../common/entities';

export function useInventoryState() {
  const { query } = useInventoryParams('/');
  const inventoryRoute = useInventoryRouter();
  const pagination = query.pagination
    ? (decode(query.pagination) as Partial<Record<EntityView, number>>)
    : undefined;

  const setGroupBy = useCallback(
    (groupBy: EntityView) => {
      inventoryRoute.replace('/', {
        path: {},
        query: {
          ...query,
          view: groupBy,
        },
      });
    },
    // Only react on changes to query
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query]
  );

  const setPagination = useCallback(
    (group: EntityView, nextPage: number) => {
      inventoryRoute.replace('/', {
        path: {},
        query: {
          ...query,
          pagination: encode({
            ...pagination,
            [group]: nextPage,
          }),
        },
      });
    },
    // If pagination has changed, so has query
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, pagination]
  );

  return {
    // Default to the ENTITY.TYPE if no grouping set
    groupBy: query.view ?? ENTITY_TYPE,
    pagination,
    setGroupBy,
    setPagination,
  };
}

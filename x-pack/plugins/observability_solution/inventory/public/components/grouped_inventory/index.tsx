/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { InventoryGroupAccordion } from './inventory_group_accordion';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useKibana } from '../../hooks/use_kibana';
import { InventorySummary } from './inventory_summary';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';

export function GroupedInventory() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { query } = useInventoryParams('/');
  const { kuery, entityTypes } = query;
  const { refreshSubject$ } = useInventorySearchBarContext();

  const {
    value = { groupBy: ENTITY_TYPE, groups: [], entitiesCount: 0 },
    refresh,
    loading,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/group_by/{field}', {
        params: {
          path: {
            field: ENTITY_TYPE,
          },
          query: {
            kuery,
            entityTypes: entityTypes?.length ? JSON.stringify(entityTypes) : undefined,
          },
        },
        signal,
      });
    },
    [entityTypes, inventoryAPIClient, kuery]
  );

  useEffectOnce(() => {
    const refreshSubscription = refreshSubject$.subscribe(refresh);

    return () => refreshSubscription.unsubscribe();
  });

  return (
    <>
      <InventorySummary totalEntities={value.entitiesCount} totalGroups={value.groups.length} />
      <EuiSpacer size="m" />
      {value.groups.map((group) => (
        <InventoryGroupAccordion
          key={`${value.groupBy}-${group[value.groupBy]}`}
          group={group}
          groupBy={value.groupBy}
          isLoading={loading}
        />
      ))}
    </>
  );
}

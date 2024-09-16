/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { EntityTable } from '../entity_table';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryBreadcrumbs } from '../../hooks/use_inventory_breadcrumbs';
import { useKibana } from '../../hooks/use_kibana';

export function TypeInventoryView() {
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const {
    path: { type },
  } = useInventoryParams('/{type}');

  const typeDefinitionFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient
        .fetch('GET /internal/inventory/entities/definition/inventory', {
          signal,
        })
        .then((response) => {
          return response.definitions.find((definition) => definition.type === type);
        });
    },
    [inventoryAPIClient, type]
  );

  useInventoryBreadcrumbs(() => {
    return {
      path: '/{type}',
      params: {
        path: {
          type,
        },
      },
      title: typeDefinitionFetch.value?.label || type,
    };
  }, [typeDefinitionFetch, type]);

  return (
    <EuiFlexGroup direction="column">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle title={typeDefinitionFetch.value?.label ?? type} />
      </InventoryPageHeader>
      <EntityTable type={type} />
    </EuiFlexGroup>
  );
}

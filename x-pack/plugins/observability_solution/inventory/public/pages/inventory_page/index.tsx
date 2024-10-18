/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { groupCountCss } from '../../components/grouped_inventory/styles';
import { GroupSelector } from '../../components/grouped_inventory/group_selector';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useKibana } from '../../hooks/use_kibana';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useInventoryState } from '../../hooks/use_inventory_state';
import { UnifiedInventoryView } from '../../components/grouped_inventory/unified_view';
import { GroupedInventoryView } from '../../components/grouped_inventory';

export function InventoryPage() {
  const { groupBy } = useInventoryState();
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const inventoryRoute = useInventoryRouter();
  const { query } = useInventoryParams('/');
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { kuery, entityTypes } = query;

  const { value = { groupBy: ENTITY_TYPE, groups: [] }, refresh } = useInventoryAbortableAsync(
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

  const totalEntities = value.groups.reduce((acc, group) => acc + group.count, 0);

  useEffectOnce(() => {
    const searchBarContentSubscription = searchBarContentSubject$.subscribe(
      ({ refresh: isRefresh, ...queryParams }) => {
        if (isRefresh) {
          refresh();
        } else {
          inventoryRoute.push('/', {
            path: {},
            query: { ...query, ...queryParams },
          });
        }
      }
    );
    return () => {
      searchBarContentSubscription.unsubscribe();
    };
  });

  return (
    <>
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <span
                css={groupCountCss}
                style={{ borderRight: groupBy === 'unified' ? 'none' : undefined }}
              >
                <FormattedMessage
                  id="xpack.inventory.groupedInventoryPage.entitiesTotalLabel"
                  defaultMessage="{total} Entities"
                  values={{ total: totalEntities }}
                />
              </span>
            </EuiFlexItem>
            {groupBy !== 'unified' ? (
              <EuiFlexItem grow={false}>
                <span css={groupCountCss} style={{ borderRight: 'none' }}>
                  <FormattedMessage
                    id="xpack.inventory.groupedInventoryPage.groupsTotalLabel"
                    defaultMessage="{total} Groups"
                    values={{ total: value.groups.length }}
                  />
                </span>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GroupSelector />
        </EuiFlexItem>
      </EuiFlexGroup>
      {groupBy === 'unified' ? <UnifiedInventoryView /> : <GroupedInventoryView value={value} />}
    </>
  );
}

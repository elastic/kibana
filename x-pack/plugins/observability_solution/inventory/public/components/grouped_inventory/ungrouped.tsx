/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGridSorting, useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { EntityType } from '../../../common/entities';
import { EntitiesGrid } from '../entities_grid';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { GroupSelector } from './group_selector';

interface Props {
  entityType?: EntityType;
}

export function UngroupedInventoryPage({ entityType }: Props) {
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { query } = useInventoryParams('/');
  const { sortDirection, sortField, pageIndex, kuery } = query;
  const { euiTheme } = useEuiTheme();
  const inventoryRoute = useInventoryRouter();

  const {
    value = { entities: [] },
    loading,
    refresh,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities', {
        params: {
          query: {
            sortDirection,
            sortField,
            entityTypes: entityType?.length ? JSON.stringify([entityType]) : undefined,
            kuery,
          },
        },
        signal,
      });
    },
    [entityType, inventoryAPIClient, kuery, sortDirection, sortField]
  );

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

  function handlePageChange(nextPage: number) {
    inventoryRoute.push('/', {
      path: {},
      query: { ...query, pageIndex: nextPage },
    });
  }

  function handleSortChange(sorting: EuiDataGridSorting['columns'][0]) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        sortField: sorting.id,
        sortDirection: sorting.direction,
      },
    });
  }

  function handleTypeFilter(type: EntityType) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        // Override the current entity types
        entityTypes: [type],
      },
    });
  }

  const totalEntities = value.entities.length;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            color: ${euiTheme.colors.subduedText};
          `}
        >
          <FormattedMessage
            id="xpack.inventory.groupedInventoryPage.entitiesTotalLabel"
            defaultMessage="{total} Entities"
            values={{ total: totalEntities }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow />
        <EuiFlexItem grow={false} className="">
          <GroupSelector />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EntitiesGrid
        entities={value.entities}
        loading={loading}
        sortDirection={sortDirection}
        sortField={sortField}
        onChangePage={handlePageChange}
        onChangeSort={handleSortChange}
        pageIndex={pageIndex}
        onFilterByType={handleTypeFilter}
      />
    </>
  );
}

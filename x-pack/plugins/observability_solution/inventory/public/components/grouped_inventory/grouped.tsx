/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiDataGridSorting,
  EuiAccordion,
  EuiSpacer,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import type { EntityType } from '../../../common/entities';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { UngroupedInventoryPage } from './ungrouped';

export function GroupedInventoryPage() {
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { query } = useInventoryParams('/');
  const { groupSortField, pageIndex, kuery, entityTypes, groupSortDirection } = query;
  const { euiTheme } = useEuiTheme();

  const inventoryRoute = useInventoryRouter();

  const {
    value = { groupBy: '', groups: [] },
    loading,
    refresh,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/group_by/{field}', {
        params: {
          path: {
            field: 'entity.type',
          },
          query: {
            groupSortField,
            groupSortDirection,
            kuery,
          },
        },
        signal,
      });
    },
    [entityTypes, inventoryAPIClient, kuery, groupSortDirection, groupSortField]
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

  function handleTypeFilter(entityType: EntityType) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        // Override the current entity types
        entityTypes: [entityType],
      },
    });
  }

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
        <EuiFlexItem
          grow={false}
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            color: ${euiTheme.colors.subduedText};
          `}
        >
          <FormattedMessage
            id="xpack.inventory.groupedInventoryPage.groupsTotalLabel"
            defaultMessage="{total} Groups"
            values={{ total: value.groups.length }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow />
        <EuiFlexItem grow={false} className="">
          Placeholder
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {value.groups.map((group) => {
        const field = group[value.groupBy];

        return (
          <>
            <EuiAccordion
              key={field}
              id={field}
              css={css`
                border-radius: ${euiTheme.border.radius.medium};
                font-weight: ${euiTheme.font.weight.bold};
              `}
              buttonContent={`Type: ${field} (${group.count})`}
              buttonProps={{ paddingSize: 'm' }}
              paddingSize="l"
              borders="all"
            >
              <UngroupedInventoryPage entityType={field} />
            </EuiAccordion>
            <EuiSpacer size="s" />
          </>
        );
      })}
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiLink,
  EuiSearchBar,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import React, { useMemo, useState } from 'react';
import { DatasetEntity, DatasetType } from '../../../common/datasets';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';

export function DatasetInventoryView() {
  const {
    core: { notifications },
    services: { inventoryAPIClient },
  } = useKibana();

  const router = useInventoryRouter();

  const [page, setPage] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  });

  const datasetsFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient
        .fetch('GET /internal/inventory/datasets', {
          signal,
        })
        .then((response) => {
          setPage((prev) => ({
            ...prev,
            pageIndex: 0,
          }));
          return response;
        })
        .catch((error) => {
          if (isRequestAbortedError(error)) {
            return;
          }

          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.inventory.datasetView.failedToFetchDatasets', {
              defaultMessage: 'Failed to fetch datasets',
            }),
          });
          throw error;
        });
    },
    [inventoryAPIClient, notifications]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DatasetEntity>>>(() => {
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.inventory.datasets.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        width: '80%',
        render: (_, { name }) => {
          return (
            <EuiLink
              data-test-subj="inventoryColumnsLink"
              href={router.link('/data_stream/{id}', {
                path: {
                  id: name,
                },
              })}
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'type',
        name: i18n.translate('xpack.inventory.datasets.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        render: (_, { type }) => {
          let label: string = '';
          switch (type) {
            case DatasetType.alias:
              label = i18n.translate('xpack.inventory.datasetType.alias', {
                defaultMessage: 'Alias',
              });

            case DatasetType.dataStream:
              label = i18n.translate('xpack.inventory.datasetType.dataStream', {
                defaultMessage: 'Data stream',
              });
          }
          return (
            <EuiText
              className={css`
                white-space: nowrap;
              `}
            >
              {label}
            </EuiText>
          );
        },
      },
    ];
  }, [router]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const datasets = datasetsFetch.value?.datasets;
    if (!datasets || !searchQuery) {
      return datasets || [];
    }

    const lowercasedSearchQuery = searchQuery.toLowerCase();

    return datasets.filter((dataset) => dataset.name.toLowerCase().includes(lowercasedSearchQuery));
  }, [datasetsFetch.value?.datasets, searchQuery]);

  const visibleItems = useMemo(() => {
    return filteredItems.slice(
      page.pageIndex * page.pageSize,
      page.pageIndex * page.pageSize + page.pageSize
    );
  }, [page.pageIndex, page.pageSize, filteredItems]);

  return (
    <EuiFlexGroup direction="column">
      <EuiSearchBar
        query={searchQuery}
        onChange={({ queryText }) => {
          setSearchQuery(queryText);
        }}
        box={{
          onChange: (event) => {
            setSearchQuery(event.currentTarget.value);
          },
          placeholder: i18n.translate(
            'xpack.inventory.datasetView.selectDatasetsToOnboardComboBoxLabel',
            { defaultMessage: 'Filter datasets' }
          ),
        }}
      />
      <EuiBasicTable<DatasetEntity>
        columns={columns}
        items={visibleItems}
        itemId="name"
        pagination={{
          pageSize: page.pageSize,
          pageIndex: page.pageIndex,
          totalItemCount: filteredItems.length ?? 0,
        }}
        loading={datasetsFetch.loading}
        noItemsMessage={i18n.translate('xpack.inventory.datasetView.noItemsMessage', {
          defaultMessage: `No matching datasets for selected patterns`,
        })}
        onChange={(criteria: CriteriaWithPagination<DatasetEntity>) => {
          const { size, index } = criteria.page;
          setPage(() => ({
            pageIndex: index,
            pageSize: size,
          }));
        }}
      />
    </EuiFlexGroup>
  );
}

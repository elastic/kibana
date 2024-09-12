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
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { partition } from 'lodash';
import React, { useMemo, useState } from 'react';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { DatasetEntity, DatasetType } from '../../../common/datasets';
import { createDatasetMatcher } from '../../../common/utils/create_dataset_matcher';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';

export function DatasetView() {
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
  }, []);

  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string }>>([
    { label: '*:*' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const allOptions = useMemo(() => {
    return (
      datasetsFetch.value?.datasets.map((dataset) => ({
        label: dataset.name,
      })) ?? []
    );
  }, [datasetsFetch.value]);

  const displayedOptions = useMemo(() => {
    const matcher = createDatasetMatcher(searchQuery);
    if (!searchQuery) {
      return allOptions;
    }
    return allOptions.filter((option) => {
      const isMatch = matcher.match(option.label);
      return isMatch;
    });
  }, [allOptions, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!datasetsFetch.value?.datasets || !selectedOptions.length) {
      return [];
    }

    const matchers = selectedOptions.map((option) => createDatasetMatcher(option.label));

    const [includeMatchers, excludeMatchers] = partition(
      matchers,
      (matcher) => !matcher.excludeIfMatch
    );

    return datasetsFetch.value.datasets.filter((dataset) => {
      return (
        includeMatchers.some((matcher) => matcher.match(dataset.name)) &&
        excludeMatchers.every((matcher) => matcher.match(dataset.name))
      );
    });
  }, [selectedOptions, datasetsFetch.value?.datasets]);

  const visibleItems = useMemo(() => {
    return filteredItems.slice(
      page.pageIndex * page.pageSize,
      page.pageIndex * page.pageSize + page.pageSize
    );
  }, [page.pageIndex, page.pageSize, filteredItems]);

  return (
    <EuiFlexGroup direction="column">
      <EuiCallOut
        title={i18n.translate('xpack.inventory.datasetView.analysisCalloutTitle', {
          defaultMessage: 'Analyze your datasets with AI',
        })}
      >
        <EuiText size="s">
          {i18n.translate('xpack.inventory.datasetView.analysisCalloutDescription', {
            defaultMessage:
              'Use AI to extract services, infrastructure and other entities from your datasets. Automatically create dashboards, SLOs, rules and anomaly detection jobs for your data.',
          })}
        </EuiText>
      </EuiCallOut>
      <EuiComboBox
        fullWidth
        selectedOptions={selectedOptions}
        onChange={(nextOptions) => {
          setSelectedOptions(() => nextOptions);
        }}
        onSearchChange={(nextSearchQuery) => {
          setSearchQuery(nextSearchQuery);
        }}
        onCreateOption={(createdOption) => {
          setSelectedOptions((prevOptions) => prevOptions.concat({ label: createdOption }));
        }}
        optionMatcher={() => true}
        options={displayedOptions}
        placeholder={i18n.translate(
          'xpack.inventory.datasetView.selectDatasetsToOnboardComboBoxLabel',
          { defaultMessage: 'Select datasets to onboard' }
        )}
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

      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexEnd">
        <EuiButton
          iconType="sparkles"
          color="primary"
          fill
          data-test-subj="inventoryDatasetViewRunAiAnalysisButton"
          disabled={!selectedOptions.length}
          onClick={() => {
            router.push('/data_stream/analyze', {
              path: {},
              query: {
                indexPatterns: selectedOptions.map((option) => option.label).join(','),
              },
            });
          }}
        >
          {i18n.translate('xpack.inventory.datasetView.analyzePatternsButtonLabel', {
            defaultMessage: 'Analyze patterns',
          })}
        </EuiButton>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

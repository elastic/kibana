/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  Direction,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiSpacer,
} from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { StatsBar, ModelsBarStats } from '../../../../../components/stats_bar';
import {
  ModelConfigResponse,
  useInferenceApiService,
} from '../../../../../services/ml_api_service/inference';
import { ModelsTableToConfigMapping } from './index';
import { TIME_FORMAT } from '../../../../../../../common/constants/time_format';

export const ModelsList: FC = () => {
  const inferenceApiService = useInferenceApiService();

  const [searchQueryText, setSearchQueryText] = useState('');

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>(ModelsTableToConfigMapping.id);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const [isLoading, setIsLoading] = useState(false);
  const [modelsStats, setModelsStats] = useState<ModelsBarStats | undefined>();
  const [items, setItems] = useState<ModelConfigResponse[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelConfigResponse[]>([]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const response = await inferenceApiService.getInferenceModel();
      setItems(response.trained_model_configs);

      setModelsStats({
        total: {
          show: true,
          value: response.trained_model_configs.length,
          label: i18n.translate('xpack.ml.inference.modelsList.totalAmountLabel', {
            defaultMessage: 'Total inference trained models',
          }),
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const columns: Array<EuiBasicTableColumn<ModelConfigResponse>> = [
    {
      field: ModelsTableToConfigMapping.id,
      name: i18n.translate('xpack.ml.inference.modelsList.modelIdHeader', {
        defaultMessage: 'Model ID',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: ModelsTableToConfigMapping.type,
      name: i18n.translate('xpack.ml.inference.modelsList.typeHeader', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      align: 'left',
    },
    {
      field: ModelsTableToConfigMapping.createdAt,
      name: i18n.translate('xpack.ml.inference.modelsList.createdAtHeader', {
        defaultMessage: 'Created At',
      }),
      dataType: 'date',
      render: (date: string) => formatDate(date, TIME_FORMAT),
      sortable: true,
    },
  ];

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: items.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };
  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: (searchChange) => {
      if (searchChange.error !== null) {
        return false;
      }
      setSearchQueryText(searchChange.queryText);
      return true;
    },
    box: {
      incremental: true,
    },
  };

  const onTableChange: EuiInMemoryTable<ModelConfigResponse>['onTableChange'] = ({
    page = { index: 0, size: 10 },
    sort = { field: ModelsTableToConfigMapping.id, direction: 'asc' },
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  const selection: EuiTableSelectionType<ModelConfigResponse> = {
    onSelectionChange: (selectedItems) => {
      setSelectedModels(selectedItems);
    },
  };
  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        {modelsStats && (
          <EuiFlexItem grow={false}>
            <StatsBar stats={modelsStats} dataTestSub={'mlInferenceModelsStatsBar'} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div data-test-subj="mlModelsTableContainer">
        <EuiInMemoryTable
          allowNeutralSort={false}
          columns={columns}
          hasActions={false}
          isExpandable={true}
          isSelectable={false}
          items={items}
          itemId={ModelsTableToConfigMapping.id}
          loading={isLoading}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          search={search}
          selection={selection}
          rowProps={(item) => ({
            'data-test-subj': `mlModelsTableRow row-${item.model_id}`,
          })}
        />
      </div>
    </>
  );
};

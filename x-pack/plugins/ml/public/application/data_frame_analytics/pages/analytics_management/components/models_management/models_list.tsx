/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  Direction,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiTitle,
  EuiButton,
  EuiSearchBarProps,
  EuiSpacer,
} from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { StatsBar, ModelsBarStats } from '../../../../../components/stats_bar';
import {
  ModelConfigResponse,
  ModelStats,
  useInferenceApiService,
} from '../../../../../services/ml_api_service/inference';
import { ModelsTableToConfigMapping } from './index';
import { TIME_FORMAT } from '../../../../../../../common/constants/time_format';
import { DeleteModelsModal } from './delete_models_modal';
import { useNotifications } from '../../../../../contexts/kibana';

type Stats = Omit<ModelStats, 'model_id'>;

export type ModelItem = ModelConfigResponse & {
  stats?: Stats;
};

export type ModelWithStats = Omit<ModelItem, 'stats'> & { stats: Stats };

export const ModelsList: FC = () => {
  const inferenceApiService = useInferenceApiService();
  const { toasts } = useNotifications();

  const [searchQueryText, setSearchQueryText] = useState('');

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>(ModelsTableToConfigMapping.id);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const [isLoading, setIsLoading] = useState(false);
  const [modelsStats, setModelsStats] = useState<ModelsBarStats | undefined>();
  const [items, setItems] = useState<ModelItem[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelItem[]>([]);

  const [modelsToDelete, setModelsToDelete] = useState<ModelWithStats[]>([]);

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
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.ml.inference.modelsList.fetchFailedErrorMessage', {
          defaultMessage: 'Models fetch failed',
        }),
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Fetches models stats and update the original object
   */
  const fetchModelsStats = useCallback(
    async (models: ModelItem[]) => {
      const modelIdsToFetch = models
        .filter((model) => model.stats === undefined)
        .map((model) => model.model_id);

      // no need to fetch
      if (modelIdsToFetch.length === 0) return true;

      try {
        const {
          trained_model_stats: modelsStatsResponse,
        } = await inferenceApiService.getInferenceModelStats(modelIdsToFetch);
        for (const { model_id: id, ...stats } of modelsStatsResponse) {
          const model = models.find((m) => m.model_id === id);
          model!.stats = stats;
        }
        setItems([...items]);
        return true;
      } catch (error) {
        toasts.addError(new Error(error.body.message), {
          title: i18n.translate('xpack.ml.inference.modelsList.fetchModelStatsErrorMessage', {
            defaultMessage: 'Fetch model stats failed',
          }),
        });
      }
    },
    [items]
  );

  async function prepareModelsForDeletion(models: ModelItem[]) {
    // Fetch model stats to check associated pipelines
    if (await fetchModelsStats(models)) {
      setModelsToDelete(models as ModelWithStats[]);
    } else {
      toasts.addDanger(
        i18n.translate('xpack.ml.inference.modelsList.unableToDeleteModelsErrorMessage', {
          defaultMessage: 'Unable to delete models',
        })
      );
    }
  }

  async function deleteModels() {
    try {
      await Promise.all(
        modelsToDelete.map((model) => inferenceApiService.deleteInferenceModel(model.model_id))
      );
      setItems(
        items.filter(
          (model) => !modelsToDelete.some((toDelete) => toDelete.model_id === model.model_id)
        )
      );
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.ml.inference.modelsList.fetchDeletionErrorMessage', {
          defaultMessage: 'Model deletion failed',
        }),
      });
    }
  }

  const actions: Array<Action<ModelItem>> = [
    {
      name: i18n.translate('xpack.ml.inference.modelsList.viewTrainingDataActionLabel', {
        defaultMessage: 'View training data',
      }),
      description: 'Clone this person',
      icon: 'list',
      type: 'icon',
      href: 'temp',
      isPrimary: true,
    },
    {
      name: i18n.translate('xpack.ml.inference.modelsList.deleteModelActionLabel', {
        defaultMessage: 'Delete model',
      }),
      description: i18n.translate('xpack.ml.inference.modelsList.deleteModelActionLabel', {
        defaultMessage: 'Delete model',
      }),
      icon: 'trash',
      type: 'icon',
      color: 'danger',
      isPrimary: false,
      onClick: async (model) => {
        await prepareModelsForDeletion([model]);
      },
    },
  ];

  const columns: Array<EuiBasicTableColumn<ModelItem>> = [
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
    {
      name: i18n.translate('xpack.ml.inference.modelsList.actionsHeader', {
        defaultMessage: 'Actions',
      }),
      actions,
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
    ...(selectedModels.length > 0
      ? {
          toolsLeft: (
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h5>
                    <FormattedMessage
                      id="xpack.ml.inference.modelsList.selectedModelsMessage"
                      defaultMessage="{modelsCount, plural, one{# model} other {# models}} selected"
                      values={{ modelsCount: selectedModels.length }}
                    />
                  </h5>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  color="danger"
                  onClick={prepareModelsForDeletion.bind(null, selectedModels)}
                >
                  <FormattedMessage
                    id="xpack.ml.inference.modelsList.deleteModelsButtonLabel"
                    defaultMessage="Delete"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        }
      : {}),
  };

  const onTableChange: EuiInMemoryTable<ModelItem>['onTableChange'] = ({
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

  const selection: EuiTableSelectionType<ModelItem> = {
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
          hasActions={true}
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
      {modelsToDelete.length > 0 && (
        <DeleteModelsModal
          onClose={async (deletionApproved) => {
            if (deletionApproved) {
              await deleteModels();
            }
            setModelsToDelete([]);
          }}
          models={modelsToDelete}
        />
      )}
    </>
  );
};

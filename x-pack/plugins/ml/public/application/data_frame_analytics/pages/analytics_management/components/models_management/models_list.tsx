/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiSearchBar,
  EuiSpacer,
  EuiButtonIcon,
  EuiBadge,
  SearchFilterConfig,
} from '@elastic/eui';

import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { StatsBar, ModelsBarStats } from '../../../../../components/stats_bar';
import { useInferenceApiService } from '../../../../../services/ml_api_service/inference';
import { ModelsTableToConfigMapping } from './index';
import { DeleteModelsModal } from './delete_models_modal';
import { useMlKibana, useMlUrlGenerator, useNotifications } from '../../../../../contexts/kibana';
import { ExpandedRow } from './expanded_row';
import {
  ModelConfigResponse,
  ModelPipelines,
  TrainedModelStat,
} from '../../../../../../../common/types/inference';
import {
  getAnalysisType,
  REFRESH_ANALYTICS_LIST_STATE,
  refreshAnalyticsList$,
  useRefreshAnalyticsList,
} from '../../../../common';
import { useTableSettings } from '../analytics_list/use_table_settings';
import { filterAnalyticsModels, AnalyticsSearchBar } from '../analytics_search_bar';
import { ML_PAGES } from '../../../../../../../common/constants/ml_url_generator';
import { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';
import { timeFormatter } from '../../../../../../../common/util/date_utils';

type Stats = Omit<TrainedModelStat, 'model_id'>;

export type ModelItem = ModelConfigResponse & {
  type?: string;
  stats?: Stats;
  pipelines?: ModelPipelines['pipelines'] | null;
};

export type ModelItemFull = Required<ModelItem>;

export const ModelsList: FC = () => {
  const {
    services: {
      application: { navigateToUrl, capabilities },
    },
  } = useMlKibana();
  const urlGenerator = useMlUrlGenerator();

  const canDeleteDataFrameAnalytics = capabilities.ml.canDeleteDataFrameAnalytics as boolean;

  const inferenceApiService = useInferenceApiService();
  const { toasts } = useNotifications();

  const [searchQueryText, setSearchQueryText] = useState('');
  const [filteredModels, setFilteredModels] = useState<ModelItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ModelItem[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelItem[]>([]);
  const [modelsToDelete, setModelsToDelete] = useState<ModelItemFull[]>([]);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const updateFilteredItems = (queryClauses: any) => {
    if (queryClauses.length) {
      const filtered = filterAnalyticsModels(items, queryClauses);
      setFilteredModels(filtered);
    } else {
      setFilteredModels(items);
    }
  };

  const filterList = () => {
    if (searchQueryText !== '') {
      const query = EuiSearchBar.Query.parse(searchQueryText);
      let clauses: any = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      updateFilteredItems(clauses);
    } else {
      updateFilteredItems([]);
    }
  };

  useEffect(() => {
    filterList();
  }, [searchQueryText, items]);

  /**
   * Fetches inference trained models.
   */
  const fetchData = useCallback(async () => {
    try {
      const response = await inferenceApiService.getInferenceModel(undefined, {
        with_pipelines: true,
        size: 1000,
      });

      const newItems = [];
      const expandedItemsToRefresh = [];

      for (const model of response) {
        const tableItem = {
          ...model,
          ...(typeof model.inference_config === 'object'
            ? { type: Object.keys(model.inference_config)[0] }
            : {}),
        };
        newItems.push(tableItem);

        if (itemIdToExpandedRowMap[model.model_id]) {
          expandedItemsToRefresh.push(tableItem);
        }
      }

      setItems(newItems);

      if (expandedItemsToRefresh.length > 0) {
        await fetchModelsStats(expandedItemsToRefresh);

        setItemIdToExpandedRowMap(
          expandedItemsToRefresh.reduce((acc, item) => {
            acc[item.model_id] = <ExpandedRow item={item as ModelItemFull} />;
            return acc;
          }, {} as Record<string, JSX.Element>)
        );
      }
    } catch (error) {
      toasts.addError(new Error(error.body?.message), {
        title: i18n.translate('xpack.ml.inference.modelsList.fetchFailedErrorMessage', {
          defaultMessage: 'Models fetch failed',
        }),
      });
    }
    setIsLoading(false);
    refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.IDLE);
  }, [itemIdToExpandedRowMap]);

  // Subscribe to the refresh observable to trigger reloading the model list.
  useRefreshAnalyticsList({
    isLoading: setIsLoading,
    onRefresh: fetchData,
  });

  const modelsStats: ModelsBarStats = useMemo(() => {
    return {
      total: {
        show: true,
        value: items.length,
        label: i18n.translate('xpack.ml.inference.modelsList.totalAmountLabel', {
          defaultMessage: 'Total inference trained models',
        }),
      },
    };
  }, [items]);

  /**
   * Fetches models stats and update the original object
   */
  const fetchModelsStats = useCallback(async (models: ModelItem[]) => {
    const modelIdsToFetch = models.map((model) => model.model_id);

    try {
      const {
        trained_model_stats: modelsStatsResponse,
      } = await inferenceApiService.getInferenceModelStats(modelIdsToFetch);

      for (const { model_id: id, ...stats } of modelsStatsResponse) {
        const model = models.find((m) => m.model_id === id);
        model!.stats = stats;
      }
      return true;
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.ml.inference.modelsList.fetchModelStatsErrorMessage', {
          defaultMessage: 'Fetch model stats failed',
        }),
      });
    }
  }, []);

  /**
   * Unique inference types from models
   */
  const inferenceTypesOptions = useMemo(() => {
    const result = items.reduce((acc, item) => {
      const type = item.inference_config && Object.keys(item.inference_config)[0];
      if (type) {
        acc.add(type);
      }
      return acc;
    }, new Set<string>());
    return [...result].map((v) => ({
      value: v,
      name: v,
    }));
  }, [items]);

  async function prepareModelsForDeletion(models: ModelItem[]) {
    // Fetch model stats to check associated pipelines
    if (await fetchModelsStats(models)) {
      setModelsToDelete(models as ModelItemFull[]);
    } else {
      toasts.addDanger(
        i18n.translate('xpack.ml.inference.modelsList.unableToDeleteModelsErrorMessage', {
          defaultMessage: 'Unable to delete models',
        })
      );
    }
  }

  /**
   * Deletes the models marked for deletion.
   */
  async function deleteModels() {
    const modelsToDeleteIds = modelsToDelete.map((model) => model.model_id);

    try {
      await Promise.all(
        modelsToDeleteIds.map((modelId) => inferenceApiService.deleteInferenceModel(modelId))
      );
      setItems(
        items.filter(
          (model) => !modelsToDelete.some((toDelete) => toDelete.model_id === model.model_id)
        )
      );
      toasts.addSuccess(
        i18n.translate('xpack.ml.inference.modelsList.successfullyDeletedMessage', {
          defaultMessage:
            '{modelsCount, plural, one {Model {modelsToDeleteIds}} other {# models}} {modelsCount, plural, one {has} other {have}} been successfully deleted',
          values: {
            modelsCount: modelsToDeleteIds.length,
            modelsToDeleteIds: modelsToDeleteIds.join(', '),
          },
        })
      );
    } catch (error) {
      toasts.addError(new Error(error?.body?.message), {
        title: i18n.translate('xpack.ml.inference.modelsList.fetchDeletionErrorMessage', {
          defaultMessage: '{modelsCount, plural, one {Model} other {Models}} deletion failed',
          values: {
            modelsCount: modelsToDeleteIds.length,
          },
        }),
      });
    }
  }

  /**
   * Table actions
   */
  const actions: Array<Action<ModelItem>> = [
    {
      name: i18n.translate('xpack.ml.inference.modelsList.viewTrainingDataActionLabel', {
        defaultMessage: 'View training data',
      }),
      description: i18n.translate('xpack.ml.inference.modelsList.viewTrainingDataActionLabel', {
        defaultMessage: 'View training data',
      }),
      icon: 'visTable',
      type: 'icon',
      available: (item) => item.metadata?.analytics_config?.id,
      onClick: async (item) => {
        if (item.metadata?.analytics_config === undefined) return;

        const url = await urlGenerator.createUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
          pageState: {
            jobId: item.metadata?.analytics_config.id as string,
            analysisType: getAnalysisType(
              item.metadata?.analytics_config.analysis
            ) as DataFrameAnalysisConfigType,
            defaultIsTraining: true,
          },
        });

        await navigateToUrl(url);
      },
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
      available: (item) => canDeleteDataFrameAnalytics,
      enabled: (item) => {
        // TODO check for permissions to delete ingest pipelines.
        // ATM undefined means pipelines fetch failed server-side.
        return !item.pipelines;
      },
    },
  ];

  const toggleDetails = async (item: ModelItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.model_id]) {
      delete itemIdToExpandedRowMapValues[item.model_id];
    } else {
      await fetchModelsStats([item]);
      itemIdToExpandedRowMapValues[item.model_id] = <ExpandedRow item={item as ModelItemFull} />;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns: Array<EuiBasicTableColumn<ModelItem>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      render: (item: ModelItem) => (
        <EuiButtonIcon
          onClick={toggleDetails.bind(null, item)}
          aria-label={
            itemIdToExpandedRowMap[item.model_id]
              ? i18n.translate('xpack.ml.inference.modelsList.collapseRow', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.ml.inference.modelsList.expandRow', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.model_id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      field: ModelsTableToConfigMapping.id,
      name: i18n.translate('xpack.ml.inference.modelsList.modelIdHeader', {
        defaultMessage: 'ID',
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
      render: (type: string) => <EuiBadge color="hollow">{type}</EuiBadge>,
    },
    {
      field: ModelsTableToConfigMapping.createdAt,
      name: i18n.translate('xpack.ml.inference.modelsList.createdAtHeader', {
        defaultMessage: 'Created at',
      }),
      dataType: 'date',
      render: timeFormatter,
      sortable: true,
    },
    {
      name: i18n.translate('xpack.ml.inference.modelsList.actionsHeader', {
        defaultMessage: 'Actions',
      }),
      actions,
    },
  ];

  const filters: SearchFilterConfig[] =
    inferenceTypesOptions && inferenceTypesOptions.length > 0
      ? [
          {
            type: 'field_value_selection',
            field: 'type',
            name: i18n.translate('xpack.ml.dataframe.analyticsList.typeFilter', {
              defaultMessage: 'Type',
            }),
            multiSelect: 'or',
            options: inferenceTypesOptions,
          },
        ]
      : [];

  const { onTableChange, pageOfItems, pagination, sorting } = useTableSettings<ModelItem>(
    ModelsTableToConfigMapping.id,
    filteredModels
  );

  const toolsLeft = (
    <EuiFlexItem grow={false}>
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
          <EuiButton color="danger" onClick={prepareModelsForDeletion.bind(null, selectedModels)}>
            <FormattedMessage
              id="xpack.ml.inference.modelsList.deleteModelsButtonLabel"
              defaultMessage="Delete"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  const isSelectionAllowed = canDeleteDataFrameAnalytics;

  const selection: EuiTableSelectionType<ModelItem> | undefined = isSelectionAllowed
    ? {
        selectableMessage: (selectable, item) => {
          return selectable
            ? i18n.translate('xpack.ml.inference.modelsList.selectableMessage', {
                defaultMessage: 'Select a model',
              })
            : i18n.translate('xpack.ml.inference.modelsList.disableSelectableMessage', {
                defaultMessage: 'Model has associated pipelines',
              });
        },
        selectable: (item) => !item.pipelines,
        onSelectionChange: (selectedItems) => {
          setSelectedModels(selectedItems);
        },
      }
    : undefined;

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
        <EuiFlexGroup alignItems="center">
          {selectedModels.length > 0 && toolsLeft}
          <EuiFlexItem>
            <AnalyticsSearchBar
              filters={filters}
              searchQueryText={searchQueryText}
              setSearchQueryText={setSearchQueryText}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiBasicTable<ModelItem>
          columns={columns}
          hasActions={true}
          isExpandable={true}
          isSelectable={false}
          items={pageOfItems}
          itemId={ModelsTableToConfigMapping.id}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          loading={isLoading}
          onChange={onTableChange}
          selection={selection}
          pagination={pagination!}
          sorting={sorting}
          data-test-subj={isLoading ? 'mlModelsTable loading' : 'mlModelsTable loaded'}
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

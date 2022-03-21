/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiSpacer,
  EuiTitle,
  SearchFilterConfig,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { getAnalysisType } from '../../data_frame_analytics/common';
import { ModelsTableToConfigMapping } from './index';
import { ModelsBarStats, StatsBar } from '../../components/stats_bar';
import { useMlKibana, useMlLocator, useNavigateToPath, useTimefilter } from '../../contexts/kibana';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useSavedObjectsApiService } from '../../services/ml_api_service/saved_objects';
import {
  ModelPipelines,
  TrainedModelConfigResponse,
  TrainedModelStat,
} from '../../../../common/types/trained_models';
import { BUILT_IN_MODEL_TAG } from '../../../../common/constants/data_frame_analytics';
import { DataFrameAnalysisConfigType } from '../../../../common/types/data_frame_analytics';
import { DeleteModelsModal } from './delete_models_modal';
import { ML_PAGES } from '../../../../common/constants/locator';
import { ListingPageUrlState } from '../../../../common/types/common';
import { usePageUrlState } from '../../util/url_state';
import { ExpandedRow } from './expanded_row';
import { isPopulatedObject } from '../../../../common';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { FIELD_FORMAT_IDS } from '../../../../../../../src/plugins/field_formats/common';
import { useRefresh } from '../../routing/use_refresh';
import { DEPLOYMENT_STATE, TRAINED_MODEL_TYPE } from '../../../../common/constants/trained_models';
import { getUserConfirmationProvider } from './force_stop_dialog';
import { MLSavedObjectsSpacesList } from '../../components/ml_saved_objects_spaces_list';
import { SavedObjectsWarning } from '../../components/saved_objects_warning';
import { TestTrainedModelFlyout } from './test';

type Stats = Omit<TrainedModelStat, 'model_id'>;

export type ModelItem = TrainedModelConfigResponse & {
  type?: string[];
  stats?: Stats;
  pipelines?: ModelPipelines['pipelines'] | null;
};

export type ModelItemFull = Required<ModelItem>;

export const getDefaultModelsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: ModelsTableToConfigMapping.id,
  sortDirection: 'asc',
});

export const BUILT_IN_MODEL_TYPE = i18n.translate(
  'xpack.ml.trainedModels.modelsList.builtInModelLabel',
  { defaultMessage: 'built-in' }
);

interface Props {
  isManagementTable?: boolean;
  pageState?: ListingPageUrlState;
  updatePageState?: (update: Partial<ListingPageUrlState>) => void;
}

export const ModelsList: FC<Props> = ({
  isManagementTable = false,
  pageState: pageStateExternal,
  updatePageState: updatePageStateExternal,
}) => {
  const {
    services: {
      application: { navigateToUrl, capabilities },
      overlays,
      theme,
      spacesApi,
    },
  } = useMlKibana();
  const urlLocator = useMlLocator()!;

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  // allow for an internally controlled page state which stores the state in the URL
  // or an external page state, which is passed in as a prop.
  // external page state is used on the management page.
  const [pageStateInternal, updatePageStateInternal] = usePageUrlState(
    ML_PAGES.TRAINED_MODELS_MANAGE,
    getDefaultModelsListState()
  );

  const [pageState, updatePageState] =
    pageStateExternal && updatePageStateExternal
      ? [pageStateExternal, updatePageStateExternal]
      : [pageStateInternal, updatePageStateInternal];

  const refresh = useRefresh();

  const searchQueryText = pageState.queryText ?? '';

  const canDeleteTrainedModels = capabilities.ml.canDeleteTrainedModels as boolean;
  const canStartStopTrainedModels = capabilities.ml.canStartStopTrainedModels as boolean;

  const trainedModelsApiService = useTrainedModelsApiService();
  const savedObjectsApiService = useSavedObjectsApiService();

  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ModelItem[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelItem[]>([]);
  const [modelIdsToDelete, setModelIdsToDelete] = useState<string[]>([]);
  const [modelSpaces, setModelSpaces] = useState<{ [modelId: string]: string[] }>({});
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );
  const [showTestFlyout, setShowTestFlyout] = useState<ModelItem | null>(null);
  const getUserConfirmation = useMemo(() => getUserConfirmationProvider(overlays, theme), []);

  const navigateToPath = useNavigateToPath();

  const isBuiltInModel = useCallback(
    (item: ModelItem) => item.tags.includes(BUILT_IN_MODEL_TAG),
    []
  );

  /**
   * Fetches trained models.
   */
  const fetchModelsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await trainedModelsApiService.getTrainedModels(undefined, {
        with_pipelines: true,
        size: 1000,
      });
      if (isManagementTable) {
        const { trainedModels } = await savedObjectsApiService.trainedModelsSpaces();
        setModelSpaces(trainedModels);
      }

      const newItems: ModelItem[] = [];
      const expandedItemsToRefresh = [];

      for (const model of response) {
        const tableItem: ModelItem = {
          ...model,
          // Extract model types
          ...(typeof model.inference_config === 'object'
            ? {
                type: [
                  model.model_type,
                  ...Object.keys(model.inference_config),
                  ...(isBuiltInModel(model) ? [BUILT_IN_MODEL_TYPE] : []),
                ],
              }
            : {}),
        };
        newItems.push(tableItem);

        if (itemIdToExpandedRowMap[model.model_id]) {
          expandedItemsToRefresh.push(tableItem);
        }
      }

      // Need to fetch state for 3rd party models to enable/disable actions
      await fetchModelsStats(
        newItems.filter((v) => v.model_type.includes(TRAINED_MODEL_TYPE.PYTORCH))
      );

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
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.trainedModels.modelsList.fetchFailedErrorMessage', {
          defaultMessage: 'Models fetch failed',
        })
      );
    }
    setIsLoading(false);
  }, [itemIdToExpandedRowMap]);

  useEffect(
    function updateOnTimerRefresh() {
      if (!refresh) return;
      fetchModelsData();
    },
    [refresh]
  );

  const modelsStats: ModelsBarStats = useMemo(() => {
    return {
      total: {
        show: true,
        value: items.length,
        label: i18n.translate('xpack.ml.trainedModels.modelsList.totalAmountLabel', {
          defaultMessage: 'Total trained models',
        }),
      },
    };
  }, [items]);

  /**
   * Fetches models stats and update the original object
   */
  const fetchModelsStats = useCallback(async (models: ModelItem[]) => {
    try {
      if (models) {
        const { trained_model_stats: modelsStatsResponse } =
          await trainedModelsApiService.getTrainedModelStats(models.map((m) => m.model_id));

        for (const { model_id: id, ...stats } of modelsStatsResponse) {
          const model = models.find((m) => m.model_id === id);
          if (model) {
            model.stats = {
              ...(model.stats ?? {}),
              ...stats,
            };
          }
        }
      }

      return true;
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.trainedModels.modelsList.fetchModelStatsErrorMessage', {
          defaultMessage: 'Fetch model stats failed',
        })
      );
      return false;
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
      acc.add(item.model_type);
      return acc;
    }, new Set<string>());
    return [...result].map((v) => ({
      value: v,
      name: v,
    }));
  }, [items]);

  /**
   * Table actions
   */
  const actions: Array<Action<ModelItem>> = [
    {
      name: i18n.translate('xpack.ml.trainedModels.modelsList.viewTrainingDataActionLabel', {
        defaultMessage: 'View training data',
      }),
      description: i18n.translate('xpack.ml.trainedModels.modelsList.viewTrainingDataActionLabel', {
        defaultMessage: 'View training data',
      }),
      icon: 'visTable',
      type: 'icon',
      available: (item) => !!item.metadata?.analytics_config?.id,
      onClick: async (item) => {
        if (item.metadata?.analytics_config === undefined) return;

        const analysisType = getAnalysisType(
          item.metadata?.analytics_config.analysis
        ) as DataFrameAnalysisConfigType;

        const url = await urlLocator.getUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
          pageState: {
            jobId: item.metadata?.analytics_config.id as string,
            analysisType,
            ...(analysisType === 'classification' || analysisType === 'regression'
              ? {
                  queryText: `${item.metadata?.analytics_config.dest.results_field}.is_training : true`,
                }
              : {}),
          },
        });

        await navigateToUrl(url);
      },
      isPrimary: true,
    },
    {
      name: i18n.translate('xpack.ml.inference.modelsList.analyticsMapActionLabel', {
        defaultMessage: 'Analytics map',
      }),
      description: i18n.translate('xpack.ml.inference.modelsList.analyticsMapActionLabel', {
        defaultMessage: 'Analytics map',
      }),
      icon: 'graphApp',
      type: 'icon',
      isPrimary: true,
      available: (item) => !!item.metadata?.analytics_config?.id,
      onClick: async (item) => {
        const path = await urlLocator.getUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_MAP,
          pageState: { modelId: item.model_id },
        });

        await navigateToPath(path, false);
      },
    },
  ];
  if (isManagementTable === false) {
    actions.push(
      ...([
        {
          name: i18n.translate('xpack.ml.inference.modelsList.startModelDeploymentActionLabel', {
            defaultMessage: 'Start deployment',
          }),
          description: i18n.translate(
            'xpack.ml.inference.modelsList.startModelDeploymentActionLabel',
            {
              defaultMessage: 'Start deployment',
            }
          ),
          icon: 'play',
          type: 'icon',
          isPrimary: true,
          enabled: (item) => {
            const { state } = item.stats?.deployment_stats ?? {};
            return (
              canStartStopTrainedModels &&
              !isLoading &&
              state !== DEPLOYMENT_STATE.STARTED &&
              state !== DEPLOYMENT_STATE.STARTING
            );
          },
          available: (item) => item.model_type === TRAINED_MODEL_TYPE.PYTORCH,
          onClick: async (item) => {
            try {
              setIsLoading(true);
              await trainedModelsApiService.startModelAllocation(item.model_id);
              displaySuccessToast(
                i18n.translate('xpack.ml.trainedModels.modelsList.startSuccess', {
                  defaultMessage: 'Deployment for "{modelId}" has been started successfully.',
                  values: {
                    modelId: item.model_id,
                  },
                })
              );
              await fetchModelsData();
            } catch (e) {
              displayErrorToast(
                e,
                i18n.translate('xpack.ml.trainedModels.modelsList.startFailed', {
                  defaultMessage: 'Failed to start "{modelId}"',
                  values: {
                    modelId: item.model_id,
                  },
                })
              );
              setIsLoading(false);
            }
          },
        },
        {
          name: i18n.translate('xpack.ml.inference.modelsList.stopModelDeploymentActionLabel', {
            defaultMessage: 'Stop deployment',
          }),
          description: i18n.translate(
            'xpack.ml.inference.modelsList.stopModelDeploymentActionLabel',
            {
              defaultMessage: 'Stop deployment',
            }
          ),
          icon: 'stop',
          type: 'icon',
          isPrimary: true,
          available: (item) => item.model_type === TRAINED_MODEL_TYPE.PYTORCH,
          enabled: (item) =>
            canStartStopTrainedModels &&
            !isLoading &&
            isPopulatedObject(item.stats?.deployment_stats) &&
            item.stats?.deployment_stats?.state !== DEPLOYMENT_STATE.STOPPING,
          onClick: async (item) => {
            const requireForceStop = isPopulatedObject(item.pipelines);

            if (requireForceStop) {
              const hasUserApproved = await getUserConfirmation(item);
              if (!hasUserApproved) return;
            }

            try {
              setIsLoading(true);
              await trainedModelsApiService.stopModelAllocation(item.model_id, {
                force: requireForceStop,
              });
              displaySuccessToast(
                i18n.translate('xpack.ml.trainedModels.modelsList.stopSuccess', {
                  defaultMessage: 'Deployment for "{modelId}" has been stopped successfully.',
                  values: {
                    modelId: item.model_id,
                  },
                })
              );
              // Need to fetch model state updates
              await fetchModelsData();
            } catch (e) {
              displayErrorToast(
                e,
                i18n.translate('xpack.ml.trainedModels.modelsList.stopFailed', {
                  defaultMessage: 'Failed to stop "{modelId}"',
                  values: {
                    modelId: item.model_id,
                  },
                })
              );
              setIsLoading(false);
            }
          },
        },
        {
          name: i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
            defaultMessage: 'Delete model',
          }),
          description: i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
            defaultMessage: 'Delete model',
          }),
          'data-test-subj': 'mlModelsTableRowDeleteAction',
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          isPrimary: false,
          onClick: (model) => {
            setModelIdsToDelete([model.model_id]);
          },
          available: (item) => canDeleteTrainedModels && !isBuiltInModel(item),
          enabled: (item) => {
            // TODO check for permissions to delete ingest pipelines.
            // ATM undefined means pipelines fetch failed server-side.
            return !isPopulatedObject(item.pipelines);
          },
        },
        {
          name: i18n.translate('xpack.ml.inference.modelsList.analyticsMapActionLabel', {
            defaultMessage: 'Test',
          }),
          description: i18n.translate('xpack.ml.inference.modelsList.analyticsMapActionLabel', {
            defaultMessage: 'Test',
          }),
          icon: 'inputOutput',
          type: 'icon',
          isPrimary: true,
          // available: (item) => !!item.metadata?.analytics_config?.id,
          onClick: (model) => {
            setShowTestFlyout(model);
          },
        },
      ] as Array<Action<ModelItem>>)
    );
  }

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
              ? i18n.translate('xpack.ml.trainedModels.modelsList.collapseRow', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.ml.trainedModels.modelsList.expandRow', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.model_id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
      'data-test-subj': 'mlModelsTableRowDetailsToggle',
    },
    {
      field: ModelsTableToConfigMapping.id,
      name: i18n.translate('xpack.ml.trainedModels.modelsList.modelIdHeader', {
        defaultMessage: 'ID',
      }),
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlModelsTableColumnId',
    },
    {
      field: ModelsTableToConfigMapping.description,
      width: '350px',
      name: i18n.translate('xpack.ml.trainedModels.modelsList.modelDescriptionHeader', {
        defaultMessage: 'Description',
      }),
      sortable: false,
      truncateText: false,
      'data-test-subj': 'mlModelsTableColumnDescription',
    },
    {
      field: ModelsTableToConfigMapping.type,
      name: i18n.translate('xpack.ml.trainedModels.modelsList.typeHeader', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      truncateText: true,
      align: 'left',
      render: (types: string[]) => (
        <EuiFlexGroup gutterSize={'xs'} wrap>
          {types.map((type) => (
            <EuiFlexItem key={type} grow={false}>
              <EuiBadge color="hollow" data-test-subj="mlModelType">
                {type}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
      'data-test-subj': 'mlModelsTableColumnType',
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.modelsList.stateHeader', {
        defaultMessage: 'State',
      }),
      sortable: (item) => item.stats?.deployment_stats?.state,
      align: 'left',
      truncateText: true,
      render: (model: ModelItem) => {
        const state = model.stats?.deployment_stats?.state;
        return state ? <EuiBadge color="hollow">{state}</EuiBadge> : null;
      },
      'data-test-subj': 'mlModelsTableColumnDeploymentState',
    },
    {
      field: ModelsTableToConfigMapping.createdAt,
      name: i18n.translate('xpack.ml.trainedModels.modelsList.createdAtHeader', {
        defaultMessage: 'Created at',
      }),
      dataType: 'date',
      render: (v: number) => dateFormatter(v),
      sortable: true,
      'data-test-subj': 'mlModelsTableColumnCreatedAt',
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.modelsList.actionsHeader', {
        defaultMessage: 'Actions',
      }),
      actions,
      'data-test-subj': 'mlModelsTableColumnActions',
    },
  ];

  if (isManagementTable) {
    columns.splice(columns.length - 1, 0, {
      field: ModelsTableToConfigMapping.id,
      name: i18n.translate('xpack.ml.trainedModels.modelsList.spacesLabel', {
        defaultMessage: 'Spaces',
      }),
      render: (id: string) => {
        const spaces = modelSpaces[id];
        return (
          <MLSavedObjectsSpacesList
            spacesApi={spacesApi}
            spaceIds={spaces ?? []}
            id={id}
            mlSavedObjectType="trained-model"
            refresh={fetchModelsData}
          />
        );
      },
      sortable: false,
      'data-test-subj': 'mlModelsTableColumnSpacesLabel',
    });
  }

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

  const toolsLeft = (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h5>
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.selectedModelsMessage"
                defaultMessage="{modelsCount, plural, one{# model} other {# models}} selected"
                values={{ modelsCount: selectedModels.length }}
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            color="danger"
            onClick={setModelIdsToDelete.bind(
              null,
              selectedModels.map((m) => m.model_id)
            )}
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.deleteModelsButtonLabel"
              defaultMessage="Delete"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  const isSelectionAllowed = canDeleteTrainedModels;

  const selection: EuiTableSelectionType<ModelItem> | undefined = isSelectionAllowed
    ? {
        selectableMessage: (selectable, item) => {
          if (selectable) {
            return i18n.translate('xpack.ml.trainedModels.modelsList.selectableMessage', {
              defaultMessage: 'Select a model',
            });
          }
          if (isPopulatedObject(item.pipelines)) {
            return i18n.translate('xpack.ml.trainedModels.modelsList.disableSelectableMessage', {
              defaultMessage: 'Model has associated pipelines',
            });
          }

          if (isBuiltInModel(item)) {
            return i18n.translate('xpack.ml.trainedModels.modelsList.builtInModelMessage', {
              defaultMessage: 'Built-in model',
            });
          }

          return '';
        },
        selectable: (item) => !isPopulatedObject(item.pipelines) && !isBuiltInModel(item),
        onSelectionChange: (selectedItems) => {
          setSelectedModels(selectedItems);
        },
      }
    : undefined;

  const { onTableChange, pagination, sorting } = useTableSettings<ModelItem>(
    items,
    pageState,
    updatePageState
  );

  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: (searchChange) => {
      if (searchChange.error !== null) {
        return false;
      }
      updatePageState({ queryText: searchChange.queryText, pageIndex: 0 });
      return true;
    },
    box: {
      incremental: true,
    },
    ...(inferenceTypesOptions && inferenceTypesOptions.length > 0
      ? {
          filters,
        }
      : {}),
    ...(selectedModels.length > 0
      ? {
          toolsLeft,
        }
      : {}),
  };

  return (
    <>
      {isManagementTable ? null : (
        <>
          <SavedObjectsWarning
            mlSavedObjectType="trained-model"
            onCloseFlyout={fetchModelsData}
            forceRefresh={isLoading}
          />
        </>
      )}
      <EuiFlexGroup justifyContent="spaceBetween">
        {modelsStats && (
          <>
            <EuiFlexItem grow={false}>
              <StatsBar stats={modelsStats} dataTestSub={'mlInferenceModelsStatsBar'} />
            </EuiFlexItem>
            {isManagementTable ? (
              <EuiFlexItem grow={false}>
                <RefreshModelsListButton refresh={fetchModelsData} isLoading={isLoading} />
              </EuiFlexItem>
            ) : null}
          </>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div data-test-subj="mlModelsTableContainer">
        <EuiInMemoryTable<ModelItem>
          allowNeutralSort={false}
          columns={columns}
          hasActions={true}
          isExpandable={true}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isSelectable={false}
          items={items}
          itemId={ModelsTableToConfigMapping.id}
          loading={isLoading}
          search={search}
          selection={isManagementTable ? undefined : selection}
          rowProps={(item) => ({
            'data-test-subj': `mlModelsTableRow row-${item.model_id}`,
          })}
          pagination={pagination}
          onTableChange={onTableChange}
          sorting={sorting}
          data-test-subj={isLoading ? 'mlModelsTable loading' : 'mlModelsTable loaded'}
        />
      </div>
      {modelIdsToDelete.length > 0 && (
        <DeleteModelsModal
          onClose={(refreshList) => {
            setModelIdsToDelete([]);
            if (refreshList) {
              fetchModelsData();
            }
          }}
          modelIds={modelIdsToDelete}
        />
      )}
      {showTestFlyout === null ? null : (
        <TestTrainedModelFlyout model={showTestFlyout} onClose={() => setShowTestFlyout(null)} />
      )}
    </>
  );
};

export const RefreshModelsListButton: FC<{ refresh: () => Promise<void>; isLoading: boolean }> = ({
  refresh,
  isLoading,
}) => {
  return (
    <EuiButtonEmpty
      data-test-subj={`mlTrainedModelsRefreshListButton${isLoading ? ' loading' : ' loaded'}`}
      onClick={refresh}
      isLoading={isLoading}
    >
      <FormattedMessage
        id="xpack.ml.trainedModels.modelsList.refreshManagementList"
        defaultMessage="Refresh"
      />
    </EuiButtonEmpty>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { useRef } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { SearchFilterConfig } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiProgress,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
  type EuiSearchBarProps,
} from '@elastic/eui';
import { groupBy, isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import type { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { usePageUrlState } from '@kbn/ml-url-state';
import { useTimefilter } from '@kbn/ml-date-picker';
import type { DeploymentState } from '@kbn/ml-trained-models-utils';
import {
  BUILT_IN_MODEL_TAG,
  BUILT_IN_MODEL_TYPE,
  DEPLOYMENT_STATE,
  ELASTIC_MODEL_DEFINITIONS,
  ELASTIC_MODEL_TAG,
  ELASTIC_MODEL_TYPE,
  ELSER_ID_V1,
  MODEL_STATE,
  type ModelState,
} from '@kbn/ml-trained-models-utils';
import { isDefined } from '@kbn/ml-is-defined';
import { useStorage } from '@kbn/ml-local-storage';
import { dynamic } from '@kbn/shared-ux-utility';
import useMountedState from 'react-use/lib/useMountedState';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import { getModelStateColor, getModelDeploymentState } from './get_model_state';
import { ML_ELSER_CALLOUT_DISMISSED } from '../../../common/types/storage';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';
import { useModelActions } from './model_actions';
import { ModelsTableToConfigMapping } from './config_mapping';
import type { ModelsBarStats } from '../components/stats_bar';
import { StatsBar } from '../components/stats_bar';
import { useMlKibana } from '../contexts/kibana';
import { useTrainedModelsApiService } from '../services/ml_api_service/trained_models';
import type {
  ModelDownloadState,
  ModelPipelines,
  TrainedModelConfigResponse,
  TrainedModelDeploymentStatsResponse,
  TrainedModelStat,
} from '../../../common/types/trained_models';
import { DeleteModelsModal } from './delete_models_modal';
import { ML_PAGES } from '../../../common/constants/locator';
import { useTableSettings } from '../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { useToastNotificationService } from '../services/toast_notification_service';
import { useFieldFormatter } from '../contexts/kibana/use_field_formatter';
import { useRefresh } from '../routing/use_refresh';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import { TestModelAndPipelineCreationFlyout } from './test_models';
import { TestDfaModelsFlyout } from './test_dfa_models_flyout';
import { AddInferencePipelineFlyout } from '../components/ml_inference';
import { useEnabledFeatures } from '../contexts/ml';

type Stats = Omit<TrainedModelStat, 'model_id' | 'deployment_stats'>;

export type ModelItem = TrainedModelConfigResponse & {
  type?: string[];
  stats?: Stats & { deployment_stats: TrainedModelDeploymentStatsResponse[] };
  pipelines?: ModelPipelines['pipelines'] | null;
  origin_job_exists?: boolean;
  deployment_ids: string[];
  putModelConfig?: object;
  state: ModelState | undefined;
  /**
   * Description of the current model state
   */
  stateDescription?: string;
  recommended?: boolean;
  supported: boolean;
  /**
   * Model name, e.g. elser
   */
  modelName?: string;
  os?: string;
  arch?: string;
  softwareLicense?: string;
  licenseUrl?: string;
  downloadState?: ModelDownloadState;
};

export type ModelItemFull = Required<ModelItem>;

interface PageUrlState {
  pageKey: typeof ML_PAGES.TRAINED_MODELS_MANAGE;
  pageUrlState: ListingPageUrlState;
}

const ExpandedRow = dynamic(async () => ({
  default: (await import('./expanded_row')).ExpandedRow,
}));

const AddModelFlyout = dynamic(async () => ({
  default: (await import('./add_model_flyout')).AddModelFlyout,
}));

const modelIdColumnName = i18n.translate('xpack.ml.trainedModels.modelsList.modelIdHeader', {
  defaultMessage: 'ID',
});

export const getDefaultModelsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: modelIdColumnName,
  sortDirection: 'asc',
  showAll: false,
});

interface Props {
  pageState?: ListingPageUrlState;
  updatePageState?: (update: Partial<ListingPageUrlState>) => void;
}

const DOWNLOAD_POLL_INTERVAL = 3000;

export const ModelsList: FC<Props> = ({
  pageState: pageStateExternal,
  updatePageState: updatePageStateExternal,
}) => {
  const isMounted = useMountedState();

  const {
    services: {
      application: { capabilities },
      docLinks,
    },
  } = useMlKibana();

  const nlpElserDocUrl = docLinks.links.ml.nlpElser;

  const { isNLPEnabled } = useEnabledFeatures();
  const [isElserCalloutDismissed, setIsElserCalloutDismissed] = useStorage(
    ML_ELSER_CALLOUT_DISMISSED,
    false
  );

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  // allow for an internally controlled page state which stores the state in the URL
  // or an external page state, which is passed in as a prop.
  // external page state is used on the management page.
  const [pageStateInternal, updatePageStateInternal] = usePageUrlState<PageUrlState>(
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

  const trainedModelsApiService = useTrainedModelsApiService();

  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ModelItem[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelItem[]>([]);
  const [modelsToDelete, setModelsToDelete] = useState<ModelItem[]>([]);
  const [modelToDeploy, setModelToDeploy] = useState<ModelItem | undefined>();
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );
  const [modelToTest, setModelToTest] = useState<ModelItem | null>(null);
  const [dfaModelToTest, setDfaModelToTest] = useState<ModelItem | null>(null);
  const [isAddModelFlyoutVisible, setIsAddModelFlyoutVisible] = useState(false);

  const isBuiltInModel = useCallback(
    (item: ModelItem) => item.tags.includes(BUILT_IN_MODEL_TAG),
    []
  );

  const isElasticModel = useCallback(
    (item: ModelItem) => item.tags.includes(ELASTIC_MODEL_TAG),
    []
  );

  // List of downloaded/existing models
  const existingModels = useMemo(() => {
    return items.filter((i) => !i.putModelConfig);
  }, [items]);

  /**
   * Checks if the model download complete.
   */
  const isDownloadComplete = useCallback(
    async (modelId: string): Promise<boolean> => {
      try {
        const response = await trainedModelsApiService.getTrainedModels(modelId, {
          include: 'definition_status',
        });
        // @ts-ignore
        return !!response[0]?.fully_defined;
      } catch (error) {
        displayErrorToast(
          error,
          i18n.translate('xpack.ml.trainedModels.modelsList.downloadStatusCheckErrorMessage', {
            defaultMessage: 'Failed to check download status',
          })
        );
      }
      return false;
    },
    [trainedModelsApiService, displayErrorToast]
  );

  /**
   * Fetches trained models.
   */
  const fetchModelsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await trainedModelsApiService.getTrainedModels(undefined, {
        with_pipelines: true,
        with_indices: true,
      });

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
                  ...(isBuiltInModel(model as ModelItem) ? [BUILT_IN_MODEL_TYPE] : []),
                  ...(isElasticModel(model as ModelItem) ? [ELASTIC_MODEL_TYPE] : []),
                ],
              }
            : {}),
        } as ModelItem;
        newItems.push(tableItem);

        if (itemIdToExpandedRowMap[model.model_id]) {
          expandedItemsToRefresh.push(tableItem);
        }
      }

      // Need to fetch stats for all models to enable/disable actions
      // TODO combine fetching models definitions and stats into a single function
      await fetchModelsStats(newItems);

      let resultItems = newItems;
      // don't add any of the built-in models (e.g. elser) if NLP is disabled
      if (isNLPEnabled) {
        const idMap = new Map<string, ModelItem>(
          resultItems.map((model) => [model.model_id, model])
        );
        const forDownload = await trainedModelsApiService.getTrainedModelDownloads();
        const notDownloaded: ModelItem[] = forDownload
          .filter(({ model_id: modelId, hidden, recommended, supported }) => {
            if (idMap.has(modelId)) {
              const model = idMap.get(modelId)!;
              if (recommended) {
                model.recommended = true;
              }
              model.supported = supported;
            }
            return !idMap.has(modelId) && !hidden;
          })
          .map<ModelItem>((modelDefinition) => {
            return {
              model_id: modelDefinition.model_id,
              type: modelDefinition.type,
              tags: modelDefinition.type?.includes(ELASTIC_MODEL_TAG) ? [ELASTIC_MODEL_TAG] : [],
              putModelConfig: modelDefinition.config,
              description: modelDefinition.description,
              state: MODEL_STATE.NOT_DOWNLOADED,
              recommended: !!modelDefinition.recommended,
              modelName: modelDefinition.modelName,
              os: modelDefinition.os,
              arch: modelDefinition.arch,
              softwareLicense: modelDefinition.license,
              licenseUrl: modelDefinition.licenseUrl,
              supported: modelDefinition.supported,
            } as ModelItem;
          });
        resultItems = [...resultItems, ...notDownloaded];
      }

      setItems(resultItems);

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
          defaultMessage: 'Error loading trained models',
        })
      );
    }
    setIsInitialized(true);
    setIsLoading(false);

    await fetchDownloadStatus();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdToExpandedRowMap, isNLPEnabled]);

  useEffect(
    function updateOnTimerRefresh() {
      if (!refresh) return;
      fetchModelsData();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh]
  );

  const modelsStats: ModelsBarStats = useMemo(() => {
    return {
      total: {
        show: true,
        value: existingModels.length,
        label: i18n.translate('xpack.ml.trainedModels.modelsList.totalAmountLabel', {
          defaultMessage: 'Total trained models',
        }),
      },
    };
  }, [existingModels]);

  /**
   * Fetches models stats and update the original object
   */
  const fetchModelsStats = useCallback(async (models: ModelItem[]) => {
    try {
      if (models) {
        const { trained_model_stats: modelsStatsResponse } =
          await trainedModelsApiService.getTrainedModelStats();

        const groupByModelId = groupBy(modelsStatsResponse, 'model_id');

        models.forEach((model) => {
          const modelStats = groupByModelId[model.model_id];
          model.stats = {
            ...(model.stats ?? {}),
            ...modelStats[0],
            deployment_stats: modelStats.map((d) => d.deployment_stats).filter(isDefined),
          };

          // Extract deployment ids from deployment stats
          model.deployment_ids = modelStats
            .map((v) => v.deployment_stats?.deployment_id)
            .filter(isDefined);

          model.state = getModelDeploymentState(model);
          model.stateDescription = model.stats.deployment_stats.reduce((acc, c) => {
            if (acc) return acc;
            return c.reason ?? '';
          }, '');
        });

        const elasticModels = models.filter((model) =>
          Object.hasOwn(ELASTIC_MODEL_DEFINITIONS, model.model_id)
        );
        if (elasticModels.length > 0) {
          for (const model of elasticModels) {
            if (Object.values(DEPLOYMENT_STATE).includes(model.state as DeploymentState)) {
              // no need to check for the download status if the model has been deployed
              continue;
            }
            const isDownloaded = await isDownloadComplete(model.model_id);
            model.state = isDownloaded ? MODEL_STATE.DOWNLOADED : MODEL_STATE.DOWNLOADING;
          }
        }
      }

      return true;
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.trainedModels.modelsList.fetchModelStatsErrorMessage', {
          defaultMessage: 'Error loading trained models statistics',
        })
      );
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downLoadStatusFetchInProgress = useRef(false);
  /**
   * Updates model list with download status
   */
  const fetchDownloadStatus = useCallback(
    /**
     * @param downloadInProgress Set of model ids that reports download in progress
     */
    async (downloadInProgress: Set<string> = new Set<string>()) => {
      // Allows only single fetch to be in progress
      if (downLoadStatusFetchInProgress.current && downloadInProgress.size === 0) return;

      try {
        downLoadStatusFetchInProgress.current = true;

        const downloadStatus = await trainedModelsApiService.getModelsDownloadStatus();

        if (isMounted()) {
          setItems((prevItems) => {
            return prevItems.map((item) => {
              const newItem = { ...item };
              if (downloadStatus[item.model_id]) {
                newItem.downloadState = downloadStatus[item.model_id];
              } else {
                if (downloadInProgress.has(item.model_id)) {
                  // Change downloading state to downloaded
                  delete newItem.downloadState;
                  newItem.state = MODEL_STATE.DOWNLOADED;
                }
              }
              return newItem;
            });
          });
        }

        const downloadedModelIds = Array.from<string>(downloadInProgress).filter(
          (v) => !downloadStatus[v]
        );

        if (downloadedModelIds.length > 0) {
          // Show success toast
          displaySuccessToast(
            i18n.translate('xpack.ml.trainedModels.modelsList.downloadCompleteSuccess', {
              defaultMessage:
                '"{modelIds}" {modelIdsLength, plural, one {has} other {have}} been downloaded successfully.',
              values: {
                modelIds: downloadedModelIds.join(', '),
                modelIdsLength: downloadedModelIds.length,
              },
            })
          );
        }

        Object.keys(downloadStatus).forEach((modelId) => {
          if (downloadStatus[modelId]) {
            downloadInProgress.add(modelId);
          }
        });
        downloadedModelIds.forEach((v) => {
          downloadInProgress.delete(v);
        });

        if (isEmpty(downloadStatus)) {
          downLoadStatusFetchInProgress.current = false;
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_POLL_INTERVAL));
        await fetchDownloadStatus(downloadInProgress);
      } catch (e) {
        downLoadStatusFetchInProgress.current = false;
      }
    },
    [trainedModelsApiService, displaySuccessToast, isMounted]
  );

  /**
   * Unique inference types from models
   */
  const inferenceTypesOptions = useMemo(() => {
    const result = existingModels.reduce((acc, item) => {
      const type = item.inference_config && Object.keys(item.inference_config)[0];
      if (type) {
        acc.add(type);
      }
      acc.add(item.model_type);
      return acc;
    }, new Set<string>());
    return [...result]
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({
        value: v,
        name: v,
      }));
  }, [existingModels]);

  const modelAndDeploymentIds = useMemo(
    () => [
      ...new Set([
        ...existingModels.flatMap((v) => v.deployment_ids),
        ...existingModels.map((i) => i.model_id),
      ]),
    ],
    [existingModels]
  );

  const onModelDownloadRequest = useCallback(
    async (modelId: string) => {
      try {
        setIsLoading(true);
        await trainedModelsApiService.installElasticTrainedModelConfig(modelId);
        // Need to fetch model state updates
        await fetchModelsData();
      } catch (e) {
        displayErrorToast(
          e,
          i18n.translate('xpack.ml.trainedModels.modelsList.downloadFailed', {
            defaultMessage: 'Failed to download "{modelId}"',
            values: { modelId },
          })
        );
        setIsLoading(true);
      }
    },
    [displayErrorToast, fetchModelsData, trainedModelsApiService]
  );

  /**
   * Table actions
   */
  const actions = useModelActions({
    isLoading,
    fetchModels: fetchModelsData,
    onTestAction: setModelToTest,
    onDfaTestAction: setDfaModelToTest,
    onModelsDeleteRequest: setModelsToDelete,
    onModelDeployRequest: setModelToDeploy,
    onLoading: setIsLoading,
    modelAndDeploymentIds,
    onModelDownloadRequest,
  });

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
      width: '32px',
      isExpander: true,
      render: (item: ModelItem) => {
        if (!item.stats) {
          return null;
        }
        return (
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
            iconType={itemIdToExpandedRowMap[item.model_id] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
      'data-test-subj': 'mlModelsTableRowDetailsToggle',
    },
    {
      name: modelIdColumnName,
      width: '15%',
      sortable: ({ model_id: modelId }: ModelItem) => modelId,
      truncateText: false,
      textOnly: false,
      'data-test-subj': 'mlModelsTableColumnId',
      render: ({ description, model_id: modelId }: ModelItem) => {
        const isTechPreview = description?.includes('(Tech Preview)');

        return (
          <EuiFlexGroup gutterSize={'s'} alignItems={'center'} wrap={true}>
            <EuiFlexItem grow={false}>{modelId}</EuiFlexItem>
            {isTechPreview ? (
              <EuiFlexItem grow={false}>
                <TechnicalPreviewBadge compressed />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.modelsList.modelDescriptionHeader', {
        defaultMessage: 'Description',
      }),
      truncateText: false,
      'data-test-subj': 'mlModelsTableColumnDescription',
      render: ({ description, recommended, tags, supported }: ModelItem) => {
        if (!description) return null;
        const descriptionText = description.replace('(Tech Preview)', '');

        const tooltipContent =
          supported === false ? (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.notSupportedDownloadContent"
              defaultMessage="Model version is not supported by your cluster's hardware configuration"
            />
          ) : recommended === false ? (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.notRecommendedDownloadContent"
              defaultMessage="Model version is not optimized for your cluster's hardware configuration"
            />
          ) : null;

        return tooltipContent ? (
          <EuiToolTip content={tooltipContent}>
            <>
              {descriptionText}&nbsp;
              <EuiIcon type={'warning'} color="warning" />
            </>
          </EuiToolTip>
        ) : (
          descriptionText
        );
      },
    },
    {
      width: '15%',
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
      width: '10%',
      name: i18n.translate('xpack.ml.trainedModels.modelsList.stateHeader', {
        defaultMessage: 'State',
      }),
      align: 'left',
      truncateText: false,
      render: ({ state, downloadState }: ModelItem) => {
        const config = getModelStateColor(state);
        if (!config) return null;

        const isDownloadInProgress = state === MODEL_STATE.DOWNLOADING && downloadState;

        const label = (
          <EuiHealth textSize={'xs'} color={config.color}>
            {config.name}
          </EuiHealth>
        );

        return (
          <EuiFlexGroup direction={'column'} gutterSize={'none'} css={{ width: '100%' }}>
            {isDownloadInProgress ? (
              <EuiFlexItem>
                <EuiProgress
                  label={label}
                  valueText={
                    <>
                      {((downloadState.downloaded_parts / downloadState.total_parts) * 100).toFixed(
                        0
                      ) + '%'}
                    </>
                  }
                  value={downloadState?.downloaded_parts}
                  max={downloadState?.total_parts}
                  size="xs"
                  color={config.color}
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem>{label}</EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
      'data-test-subj': 'mlModelsTableColumnDeploymentState',
    },
    {
      width: '20%',
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
      width: '15%',
      name: i18n.translate('xpack.ml.trainedModels.modelsList.actionsHeader', {
        defaultMessage: 'Actions',
      }),
      actions,
      'data-test-subj': 'mlModelsTableColumnActions',
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
            onClick={setModelsToDelete.bind(null, selectedModels)}
            data-test-subj="mlTrainedModelsDeleteSelectedModelsButton"
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
        selectable: (item) =>
          !isPopulatedObject(item.pipelines) &&
          !isBuiltInModel(item) &&
          !(isElasticModel(item) && !item.state),
        onSelectionChange: (selectedItems) => {
          setSelectedModels(selectedItems);
        },
      }
    : undefined;

  const { onTableChange, pagination, sorting } = useTableSettings<ModelItem>(
    items.length,
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

  const isElserCalloutVisible =
    !isElserCalloutDismissed && items.findIndex((i) => i.model_id === ELSER_ID_V1) >= 0;

  const tableItems = useMemo(() => {
    if (pageState.showAll) {
      return items;
    } else {
      return items.filter((item) => item.supported !== false);
    }
  }, [items, pageState.showAll]);

  if (!isInitialized) return null;

  return (
    <>
      <SavedObjectsWarning onCloseFlyout={fetchModelsData} forceRefresh={isLoading} />
      <EuiFlexGroup justifyContent="spaceBetween">
        {modelsStats ? (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <StatsBar stats={modelsStats} dataTestSub={'mlInferenceModelsStatsBar'} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.showAllLabel"
                      defaultMessage="Show all"
                    />
                  }
                  checked={!!pageState.showAll}
                  onChange={(e) => updatePageState({ showAll: e.target.checked })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType={'plusInCircle'}
            color={'primary'}
            onClick={setIsAddModelFlyoutVisible.bind(null, true)}
            data-test-subj="mlModelsAddTrainedModelButton"
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.addModelButtonLabel"
              defaultMessage="Add trained model"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div data-test-subj="mlModelsTableContainer">
        <EuiInMemoryTable<ModelItem>
          responsiveBreakpoint={'xl'}
          allowNeutralSort={false}
          columns={columns}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          items={tableItems}
          itemId={ModelsTableToConfigMapping.id}
          loading={isLoading}
          search={search}
          selection={selection}
          rowProps={(item) => ({
            'data-test-subj': `mlModelsTableRow row-${item.model_id}`,
          })}
          pagination={pagination}
          onTableChange={onTableChange}
          sorting={sorting}
          data-test-subj={isLoading ? 'mlModelsTable loading' : 'mlModelsTable loaded'}
          childrenBetween={
            isElserCalloutVisible ? (
              <>
                <EuiCallOut
                  size="s"
                  title={
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.newElserModelTitle"
                      defaultMessage="New ELSER model now available"
                    />
                  }
                  onDismiss={setIsElserCalloutDismissed.bind(null, true)}
                >
                  <FormattedMessage
                    id="xpack.ml.trainedModels.modelsList.newElserModelDescription"
                    defaultMessage="A new version of ELSER that shows faster performance and improved relevance is now available. {docLink} for information on how to start using it."
                    values={{
                      docLink: (
                        <EuiLink href={nlpElserDocUrl} external target={'_blank'}>
                          <FormattedMessage
                            id="xpack.ml.trainedModels.modelsList.startDeployment.viewElserDocLink"
                            defaultMessage="View documentation"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            ) : null
          }
        />
      </div>
      {modelsToDelete.length > 0 && (
        <DeleteModelsModal
          onClose={(refreshList) => {
            setModelsToDelete([]);
            if (refreshList) {
              fetchModelsData();
            }
          }}
          models={modelsToDelete}
        />
      )}
      {modelToTest === null ? null : (
        <TestModelAndPipelineCreationFlyout
          model={modelToTest}
          onClose={(refreshList?: boolean) => {
            setModelToTest(null);
            if (refreshList) {
              fetchModelsData();
            }
          }}
        />
      )}
      {dfaModelToTest === null ? null : (
        <TestDfaModelsFlyout model={dfaModelToTest} onClose={setDfaModelToTest.bind(null, null)} />
      )}
      {modelToDeploy !== undefined ? (
        <AddInferencePipelineFlyout
          onClose={setModelToDeploy.bind(null, undefined)}
          model={modelToDeploy}
        />
      ) : null}
      {isAddModelFlyoutVisible ? (
        <AddModelFlyout
          modelDownloads={items.filter((i) => i.state === MODEL_STATE.NOT_DOWNLOADED)}
          onClose={setIsAddModelFlyoutVisible.bind(null, false)}
          onSubmit={(modelId) => {
            onModelDownloadRequest(modelId);
            setIsAddModelFlyoutVisible(false);
          }}
        />
      ) : null}
    </>
  );
};

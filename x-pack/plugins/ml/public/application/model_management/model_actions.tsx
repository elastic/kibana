/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { i18n } from '@kbn/i18n';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  BUILT_IN_MODEL_TAG,
  DEPLOYMENT_STATE,
  TRAINED_MODEL_TYPE,
} from '@kbn/ml-trained-models-utils';
import {
  ELASTIC_MODEL_TAG,
  MODEL_STATE,
} from '@kbn/ml-trained-models-utils/src/constants/trained_models';
import {
  getAnalysisType,
  type DataFrameAnalysisConfigType,
} from '@kbn/ml-data-frame-analytics-utils';
import { useTrainedModelsApiService } from '../services/ml_api_service/trained_models';
import { getUserConfirmationProvider } from './force_stop_dialog';
import { useToastNotificationService } from '../services/toast_notification_service';
import { getUserInputModelDeploymentParamsProvider } from './deployment_setup';
import { useMlKibana, useMlLocator, useNavigateToPath } from '../contexts/kibana';
import { ML_PAGES } from '../../../common/constants/locator';
import { isTestable } from './test_models';
import { ModelItem } from './models_list';

export function useModelActions({
  onTestAction,
  onModelsDeleteRequest,
  onModelDeployRequest,
  onLoading,
  isLoading,
  fetchModels,
  modelAndDeploymentIds,
}: {
  isLoading: boolean;
  onTestAction: (model: ModelItem) => void;
  onModelsDeleteRequest: (models: ModelItem[]) => void;
  onModelDeployRequest: (model: ModelItem) => void;
  onLoading: (isLoading: boolean) => void;
  fetchModels: () => Promise<void>;
  modelAndDeploymentIds: string[];
}): Array<Action<ModelItem>> {
  const {
    services: {
      application: { navigateToUrl, capabilities },
      overlays,
      theme,
      i18n: i18nStart,
      docLinks,
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const [canManageIngestPipelines, setCanManageIngestPipelines] = useState(false);

  const startModelDeploymentDocUrl = docLinks.links.ml.startTrainedModelsDeployment;

  const navigateToPath = useNavigateToPath();

  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const urlLocator = useMlLocator()!;

  const trainedModelsApiService = useTrainedModelsApiService();

  const canStartStopTrainedModels = capabilities.ml.canStartStopTrainedModels as boolean;
  const canTestTrainedModels = capabilities.ml.canTestTrainedModels as boolean;
  const canDeleteTrainedModels = capabilities.ml.canDeleteTrainedModels as boolean;

  useEffect(() => {
    let isMounted = true;
    mlApiServices
      .hasPrivileges({
        cluster: ['manage_ingest_pipelines'],
      })
      .then((result) => {
        const canManagePipelines = result.cluster?.manage_ingest_pipelines;
        if (isMounted) {
          setCanManageIngestPipelines(canManagePipelines);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [mlApiServices]);

  const getUserConfirmation = useMemo(
    () => getUserConfirmationProvider(overlays, theme, i18nStart),
    [i18nStart, overlays, theme]
  );

  const getUserInputModelDeploymentParams = useMemo(
    () =>
      getUserInputModelDeploymentParamsProvider(
        overlays,
        theme,
        i18nStart,
        startModelDeploymentDocUrl
      ),
    [overlays, theme, i18nStart, startModelDeploymentDocUrl]
  );

  const isBuiltInModel = useCallback(
    (item: ModelItem) => item.tags.includes(BUILT_IN_MODEL_TAG),
    []
  );

  return useMemo(
    () => [
      {
        name: i18n.translate('xpack.ml.trainedModels.modelsList.viewTrainingDataActionLabel', {
          defaultMessage: 'View training data',
        }),
        description: i18n.translate(
          'xpack.ml.trainedModels.modelsList.viewTrainingDataActionLabel',
          {
            defaultMessage: 'View training data',
          }
        ),
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
        'data-test-subj': 'mlModelsTableRowStartDeploymentAction',
        icon: 'play',
        type: 'icon',
        isPrimary: true,
        enabled: (item) => {
          return canStartStopTrainedModels && !isLoading && item.state !== MODEL_STATE.DOWNLOADING;
        },
        available: (item) => item.model_type === TRAINED_MODEL_TYPE.PYTORCH,
        onClick: async (item) => {
          const modelDeploymentParams = await getUserInputModelDeploymentParams(
            item,
            undefined,
            modelAndDeploymentIds
          );

          if (!modelDeploymentParams) return;

          try {
            onLoading(true);
            await trainedModelsApiService.startModelAllocation(item.model_id, {
              number_of_allocations: modelDeploymentParams.numOfAllocations,
              threads_per_allocation: modelDeploymentParams.threadsPerAllocations!,
              priority: modelDeploymentParams.priority!,
              deployment_id: !!modelDeploymentParams.deploymentId
                ? modelDeploymentParams.deploymentId
                : item.model_id,
            });
            displaySuccessToast(
              i18n.translate('xpack.ml.trainedModels.modelsList.startSuccess', {
                defaultMessage: 'Deployment for "{modelId}" has been started successfully.',
                values: {
                  modelId: item.model_id,
                },
              })
            );
            await fetchModels();
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
            onLoading(false);
          }
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.updateModelDeploymentActionLabel', {
          defaultMessage: 'Update deployment',
        }),
        description: i18n.translate(
          'xpack.ml.inference.modelsList.updateModelDeploymentActionLabel',
          {
            defaultMessage: 'Update deployment',
          }
        ),
        'data-test-subj': 'mlModelsTableRowUpdateDeploymentAction',
        icon: 'documentEdit',
        type: 'icon',
        isPrimary: false,
        available: (item) =>
          item.model_type === TRAINED_MODEL_TYPE.PYTORCH &&
          canStartStopTrainedModels &&
          !isLoading &&
          !!item.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTED),
        onClick: async (item) => {
          const deploymentToUpdate = item.deployment_ids[0];

          const deploymentParams = await getUserInputModelDeploymentParams(item, {
            deploymentId: deploymentToUpdate,
            numOfAllocations: item.stats!.deployment_stats.find(
              (v) => v.deployment_id === deploymentToUpdate
            )!.number_of_allocations,
          });

          if (!deploymentParams) return;

          try {
            onLoading(true);
            await trainedModelsApiService.updateModelDeployment(
              item.model_id,
              deploymentParams.deploymentId!,
              {
                number_of_allocations: deploymentParams.numOfAllocations,
              }
            );
            displaySuccessToast(
              i18n.translate('xpack.ml.trainedModels.modelsList.updateSuccess', {
                defaultMessage: 'Deployment for "{modelId}" has been updated successfully.',
                values: {
                  modelId: item.model_id,
                },
              })
            );
            await fetchModels();
          } catch (e) {
            displayErrorToast(
              e,
              i18n.translate('xpack.ml.trainedModels.modelsList.updateFailed', {
                defaultMessage: 'Failed to update "{modelId}"',
                values: {
                  modelId: item.model_id,
                },
              })
            );
            onLoading(false);
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
        'data-test-subj': 'mlModelsTableRowStopDeploymentAction',
        icon: 'stop',
        type: 'icon',
        isPrimary: true,
        available: (item) => item.model_type === TRAINED_MODEL_TYPE.PYTORCH,
        enabled: (item) =>
          canStartStopTrainedModels && !isLoading && item.deployment_ids.length > 0,
        onClick: async (item) => {
          const requireForceStop = isPopulatedObject(item.pipelines);
          const hasMultipleDeployments = item.deployment_ids.length > 1;

          let deploymentIds: string[] = item.deployment_ids;
          if (requireForceStop || hasMultipleDeployments) {
            try {
              deploymentIds = await getUserConfirmation(item);
            } catch (error) {
              return;
            }
          }

          try {
            onLoading(true);
            const results = await trainedModelsApiService.stopModelAllocation(
              item.model_id,
              deploymentIds,
              {
                force: requireForceStop,
              }
            );
            displaySuccessToast(
              i18n.translate('xpack.ml.trainedModels.modelsList.stopSuccess', {
                defaultMessage:
                  '{numberOfDeployments, plural, one {Deployment} other {Deployments}}  for "{modelId}" has been stopped successfully.',
                values: {
                  modelId: item.model_id,
                  numberOfDeployments: deploymentIds.length,
                },
              })
            );
            if (Object.values(results).some((r) => r.error !== undefined)) {
              Object.entries(results).forEach(([id, r]) => {
                if (r.error !== undefined) {
                  displayErrorToast(
                    r.error,
                    i18n.translate('xpack.ml.trainedModels.modelsList.stopDeploymentWarning', {
                      defaultMessage: 'Failed to stop "{deploymentId}"',
                      values: {
                        deploymentId: id,
                      },
                    })
                  );
                }
              });
            }
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
            onLoading(false);
          }
          // Need to fetch model state updates
          await fetchModels();
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.downloadModelActionLabel', {
          defaultMessage: 'Download model',
        }),
        description: i18n.translate('xpack.ml.inference.modelsList.downloadModelActionLabel', {
          defaultMessage: 'Download model',
        }),
        'data-test-subj': 'mlModelsTableRowDownloadModelAction',
        icon: 'download',
        type: 'icon',
        isPrimary: true,
        available: (item) => item.tags.includes(ELASTIC_MODEL_TAG),
        enabled: (item) => !item.state && !isLoading,
        onClick: async (item) => {
          try {
            onLoading(true);
            await trainedModelsApiService.putTrainedModelConfig(
              item.model_id,
              item.putModelConfig!
            );
            displaySuccessToast(
              i18n.translate('xpack.ml.trainedModels.modelsList.downloadSuccess', {
                defaultMessage: '"{modelId}" model download has been started successfully.',
                values: {
                  modelId: item.model_id,
                },
              })
            );
            // Need to fetch model state updates
            await fetchModels();
          } catch (e) {
            displayErrorToast(
              e,
              i18n.translate('xpack.ml.trainedModels.modelsList.downloadFailed', {
                defaultMessage: 'Failed to download "{modelId}"',
                values: {
                  modelId: item.model_id,
                },
              })
            );
            onLoading(false);
          }
        },
      },
      {
        name: (model) => {
          const hasDeployments = model.state === MODEL_STATE.STARTED;
          return (
            <EuiToolTip
              position="left"
              content={
                hasDeployments
                  ? i18n.translate(
                      'xpack.ml.trainedModels.modelsList.deleteDisabledWithDeploymentsTooltip',
                      {
                        defaultMessage: 'Model has started deployments',
                      }
                    )
                  : null
              }
            >
              <>
                {i18n.translate('xpack.ml.trainedModels.modelsList.deployModelActionLabel', {
                  defaultMessage: 'Deploy model',
                })}
              </>
            </EuiToolTip>
          );
        },
        description: i18n.translate('xpack.ml.trainedModels.modelsList.deployModelActionLabel', {
          defaultMessage: 'Deploy model',
        }),
        'data-test-subj': 'mlModelsTableRowDeployAction',
        icon: 'continuityAbove',
        type: 'icon',
        isPrimary: false,
        onClick: (model) => {
          onModelDeployRequest(model);
        },
        available: (item) => {
          const isDfaTrainedModel =
            item.metadata?.analytics_config !== undefined ||
            item.inference_config?.regression !== undefined ||
            item.inference_config?.classification !== undefined;

          return (
            isDfaTrainedModel &&
            !isBuiltInModel(item) &&
            !item.putModelConfig &&
            canManageIngestPipelines
          );
        },
        enabled: (item) => {
          return item.state !== MODEL_STATE.STARTED;
        },
      },
      {
        name: (model) => {
          const hasDeployments = model.state === MODEL_STATE.STARTED;
          return (
            <EuiToolTip
              position="left"
              content={
                hasDeployments
                  ? i18n.translate(
                      'xpack.ml.trainedModels.modelsList.deleteDisabledWithDeploymentsTooltip',
                      {
                        defaultMessage: 'Model has started deployments',
                      }
                    )
                  : null
              }
            >
              <>
                {i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
                  defaultMessage: 'Delete model',
                })}
              </>
            </EuiToolTip>
          );
        },
        description: i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
          defaultMessage: 'Delete model',
        }),
        'data-test-subj': 'mlModelsTableRowDeleteAction',
        icon: 'trash',
        type: 'icon',
        color: 'danger',
        isPrimary: false,
        onClick: (model) => {
          onModelsDeleteRequest([model]);
        },
        available: (item) => {
          const hasZeroPipelines = Object.keys(item.pipelines ?? {}).length === 0;
          return (
            canDeleteTrainedModels &&
            !isBuiltInModel(item) &&
            !item.putModelConfig &&
            (hasZeroPipelines || canManageIngestPipelines)
          );
        },
        enabled: (item) => {
          return item.state !== MODEL_STATE.STARTED;
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.testModelActionLabel', {
          defaultMessage: 'Test model',
        }),
        description: i18n.translate('xpack.ml.inference.modelsList.testModelActionLabel', {
          defaultMessage: 'Test model',
        }),
        'data-test-subj': 'mlModelsTableRowTestAction',
        icon: 'inputOutput',
        type: 'icon',
        isPrimary: true,
        available: isTestable,
        onClick: (item) => onTestAction(item),
        enabled: (item) => {
          return canTestTrainedModels && isTestable(item, true) && !isLoading;
        },
      },
    ],
    [
      urlLocator,
      navigateToUrl,
      navigateToPath,
      canStartStopTrainedModels,
      isLoading,
      getUserInputModelDeploymentParams,
      modelAndDeploymentIds,
      onLoading,
      trainedModelsApiService,
      displaySuccessToast,
      fetchModels,
      displayErrorToast,
      getUserConfirmation,
      onModelsDeleteRequest,
      onModelDeployRequest,
      canDeleteTrainedModels,
      isBuiltInModel,
      onTestAction,
      canTestTrainedModels,
      canManageIngestPipelines,
    ]
  );
}

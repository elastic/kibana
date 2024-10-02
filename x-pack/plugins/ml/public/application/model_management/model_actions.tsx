/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
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
import { isTestable, isDfaTrainedModel } from './test_models';
import type { ModelItem } from './models_list';
import { usePermissionCheck } from '../capabilities/check_capabilities';

export function useModelActions({
  onDfaTestAction,
  onTestAction,
  onModelsDeleteRequest,
  onModelDeployRequest,
  onLoading,
  isLoading,
  fetchModels,
  modelAndDeploymentIds,
  onModelDownloadRequest,
}: {
  isLoading: boolean;
  onDfaTestAction: (model: ModelItem) => void;
  onTestAction: (model: ModelItem) => void;
  onModelsDeleteRequest: (models: ModelItem[]) => void;
  onModelDeployRequest: (model: ModelItem) => void;
  onModelDownloadRequest: (modelId: string) => void;
  onLoading: (isLoading: boolean) => void;
  fetchModels: () => Promise<void>;
  modelAndDeploymentIds: string[];
}): Array<Action<ModelItem>> {
  const {
    services: {
      application: { navigateToUrl },
      overlays,
      docLinks,
      mlServices: { mlApiServices },
      ...startServices
    },
  } = useMlKibana();

  const [
    canCreateTrainedModels,
    canStartStopTrainedModels,
    canTestTrainedModels,
    canDeleteTrainedModels,
  ] = usePermissionCheck([
    'canCreateTrainedModels',
    'canStartStopTrainedModels',
    'canTestTrainedModels',
    'canDeleteTrainedModels',
  ]);

  const [canManageIngestPipelines, setCanManageIngestPipelines] = useState<boolean>(false);

  const startModelDeploymentDocUrl = docLinks.links.ml.startTrainedModelsDeployment;

  const navigateToPath = useNavigateToPath();

  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const urlLocator = useMlLocator()!;

  const trainedModelsApiService = useTrainedModelsApiService();

  useEffect(() => {
    let isMounted = true;
    mlApiServices
      .hasPrivileges({
        cluster: ['manage_ingest_pipelines'],
      })
      .then((result) => {
        if (isMounted) {
          setCanManageIngestPipelines(
            result.hasPrivileges === undefined ||
              result.hasPrivileges.cluster?.manage_ingest_pipelines === true
          );
        }
      });
    return () => {
      isMounted = false;
    };
  }, [mlApiServices]);

  const getUserConfirmation = useMemo(
    () => getUserConfirmationProvider(overlays, startServices),
    [overlays, startServices]
  );

  const getUserInputModelDeploymentParams = useMemo(
    () =>
      getUserInputModelDeploymentParamsProvider(
        overlays,
        startServices,
        startModelDeploymentDocUrl
      ),
    [overlays, startServices, startModelDeploymentDocUrl]
  );

  const isBuiltInModel = useCallback(
    (item: ModelItem) => item.tags.includes(BUILT_IN_MODEL_TAG),
    []
  );

  return useMemo(
    () => [
      {
        name: i18n.translate('xpack.ml.trainedModels.modelsList.viewTrainingDataNameActionLabel', {
          defaultMessage: 'View training data',
        }),
        description: i18n.translate(
          'xpack.ml.trainedModels.modelsList.viewTrainingDataActionLabel',
          {
            defaultMessage: 'Training data can be viewed when data frame analytics job exists.',
          }
        ),
        icon: 'visTable',
        type: 'icon',
        available: (item) => !!item.metadata?.analytics_config?.id,
        enabled: (item) => item.origin_job_exists === true,
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
          defaultMessage: 'Deploy',
        }),
        description: i18n.translate(
          'xpack.ml.inference.modelsList.startModelDeploymentActionDescription',
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
        isPrimary: false,
        available: (item) =>
          item.model_type === TRAINED_MODEL_TYPE.PYTORCH &&
          canStartStopTrainedModels &&
          (item.state === MODEL_STATE.STARTED || item.state === MODEL_STATE.STARTING) &&
          // Only show the action if there is at least one deployment that is not used by the inference service
          (!Array.isArray(item.inference_apis) ||
            item.deployment_ids.some(
              (dId) =>
                Array.isArray(item.inference_apis) &&
                !item.inference_apis.some((inference) => inference.inference_id === dId)
            )),
        enabled: (item) => !isLoading,
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
          defaultMessage: 'Download',
        }),
        description: i18n.translate('xpack.ml.inference.modelsList.downloadModelActionLabel', {
          defaultMessage: 'Download',
        }),
        'data-test-subj': 'mlModelsTableRowDownloadModelAction',
        icon: 'download',
        type: 'icon',
        isPrimary: true,
        available: (item) =>
          canCreateTrainedModels &&
          item.tags.includes(ELASTIC_MODEL_TAG) &&
          item.state === MODEL_STATE.NOT_DOWNLOADED,
        enabled: (item) => !isLoading,
        onClick: async (item) => {
          onModelDownloadRequest(item.model_id);
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
          return (
            isDfaTrainedModel(item) &&
            !isBuiltInModel(item) &&
            !item.putModelConfig &&
            canManageIngestPipelines
          );
        },
        enabled: (item) => {
          return canStartStopTrainedModels && item.state !== MODEL_STATE.STARTED;
        },
      },
      {
        name: (model) => {
          return (
            <>
              {i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
                defaultMessage: 'Delete model',
              })}
            </>
          );
        },
        description: (model: ModelItem) => {
          const hasDeployments = model.deployment_ids.length > 0;
          const { hasInferenceServices } = model;
          return hasInferenceServices
            ? i18n.translate(
                'xpack.ml.trainedModels.modelsList.deleteDisabledWithInferenceServicesTooltip',
                {
                  defaultMessage: 'Model is used by the _inference API',
                }
              )
            : hasDeployments
            ? i18n.translate(
                'xpack.ml.trainedModels.modelsList.deleteDisabledWithDeploymentsTooltip',
                {
                  defaultMessage: 'Model has started deployments',
                }
              )
            : i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
                defaultMessage: 'Delete model',
              });
        },
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
        onClick: (item) => {
          if (isDfaTrainedModel(item) && !isBuiltInModel(item)) {
            onDfaTestAction(item);
          } else {
            onTestAction(item);
          }
        },
        enabled: (item) => {
          return canTestTrainedModels && isTestable(item, true) && !isLoading;
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.analyzeDataDriftLabel', {
          defaultMessage: 'Analyze data drift',
        }),
        description: i18n.translate('xpack.ml.inference.modelsList.analyzeDataDriftLabel', {
          defaultMessage: 'Analyze data drift',
        }),
        'data-test-subj': 'mlModelsAnalyzeDataDriftAction',
        icon: 'visTagCloud',
        type: 'icon',
        isPrimary: true,
        available: (item) => {
          return (
            item?.metadata?.analytics_config !== undefined ||
            (Array.isArray(item.indices) && item.indices.length > 0)
          );
        },
        onClick: async (item) => {
          let indexPatterns: string[] | undefined = item?.indices
            ?.map((o) => Object.keys(o))
            .flat();

          if (item?.metadata?.analytics_config?.dest?.index !== undefined) {
            const destIndex = item.metadata.analytics_config.dest?.index;
            indexPatterns = [destIndex];
          }
          const path = await urlLocator.getUrl({
            page: ML_PAGES.DATA_DRIFT_CUSTOM,
            pageState: indexPatterns ? { comparison: indexPatterns.join(',') } : {},
          });

          await navigateToPath(path, false);
        },
      },
    ],
    [
      canCreateTrainedModels,
      canDeleteTrainedModels,
      canManageIngestPipelines,
      canStartStopTrainedModels,
      canTestTrainedModels,
      displayErrorToast,
      displaySuccessToast,
      fetchModels,
      getUserConfirmation,
      getUserInputModelDeploymentParams,
      isBuiltInModel,
      isLoading,
      modelAndDeploymentIds,
      navigateToPath,
      navigateToUrl,
      onDfaTestAction,
      onLoading,
      onModelDeployRequest,
      onModelsDeleteRequest,
      onTestAction,
      trainedModelsApiService,
      urlLocator,
      onModelDownloadRequest,
    ]
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC, useCallback, useMemo, useState } from 'react';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { DefaultItemAction } from '@elastic/eui/src/components/basic_table/action_types';
import { BUILT_IN_MODEL_TAG } from '../../../../common/constants/data_frame_analytics';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { getUserConfirmationProvider } from './force_stop_dialog';
import { getUserInputThreadingParamsProvider } from './start_deployment_setup';
import { useMlKibana, useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { getAnalysisType } from '../../../../common/util/analytics_utils';
import { DataFrameAnalysisConfigType } from '../../../../common/types/data_frame_analytics';
import { ML_PAGES } from '../../../../common/constants/locator';
import { DEPLOYMENT_STATE, TRAINED_MODEL_TYPE } from '../../../../common/constants/trained_models';
import { isTestable, isTestEnabled } from './test_models';
import { ModelItem } from './models_list';

interface TrainedModelActionsProps {
  modelItem: ModelItem;
  setShowTestFlyout: (item: ModelItem) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  setModelIdsToDelete: (ids: string[]) => void;
  onRefresh: () => void;
}
export const TrainedModelActions: FC<TrainedModelActionsProps> = ({
  modelItem,
  setShowTestFlyout,
  isLoading,
  setIsLoading,
  setModelIdsToDelete,
  onRefresh,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const {
    services: {
      application: { navigateToUrl, capabilities },
      overlays,
      theme,
      docLinks,
    },
  } = useMlKibana();
  const startModelDeploymentDocUrl = docLinks.links.ml.startTrainedModelsDeployment;
  const urlLocator = useMlLocator()!;
  const navigateToPath = useNavigateToPath();
  const canStartStopTrainedModels = capabilities.ml.canStartStopTrainedModels as boolean;
  const canTestTrainedModels = capabilities.ml.canTestTrainedModels as boolean;
  const trainedModelsApiService = useTrainedModelsApiService();

  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const getUserConfirmation = useMemo(() => getUserConfirmationProvider(overlays, theme), []);

  const getUserInputThreadingParams = useMemo(
    () => getUserInputThreadingParamsProvider(overlays, theme.theme$, startModelDeploymentDocUrl),
    [overlays, theme.theme$, startModelDeploymentDocUrl]
  );
  const canDeleteTrainedModels = capabilities.ml.canDeleteTrainedModels as boolean;

  const isBuiltInModel = useCallback(
    (item: ModelItem) => item.tags.includes(BUILT_IN_MODEL_TAG),
    []
  );

  /**
   * Table actions.
   *
   * At the moment EuiInMemoryTable actions don't support tooltips,
   * hence we pass objects of the standard interface to the custom component.
   */
  const actions: Array<DefaultItemAction<ModelItem>> = [
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
    {
      name: i18n.translate('xpack.ml.inference.modelsList.startModelDeploymentActionLabel', {
        defaultMessage: 'Start deployment',
      }),
      description: i18n.translate('xpack.ml.inference.modelsList.startModelDeploymentActionLabel', {
        defaultMessage: 'Start deployment',
      }),
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
        const threadingParams = await getUserInputThreadingParams(item.model_id);

        if (!threadingParams) return;

        try {
          setIsLoading(true);
          await trainedModelsApiService.startModelAllocation(item.model_id, {
            number_of_allocations: threadingParams.numOfAllocations,
            threads_per_allocation: threadingParams.threadsPerAllocations,
          });
          displaySuccessToast(
            i18n.translate('xpack.ml.trainedModels.modelsList.startSuccess', {
              defaultMessage: 'Deployment for "{modelId}" has been started successfully.',
              values: {
                modelId: item.model_id,
              },
            })
          );
          await onRefresh();
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
      description: i18n.translate('xpack.ml.inference.modelsList.stopModelDeploymentActionLabel', {
        defaultMessage: 'Stop deployment',
      }),
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
          await onRefresh();
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
      name: i18n.translate('xpack.ml.inference.modelsList.testModelActionLabel', {
        defaultMessage: 'Test model',
      }),
      description: i18n.translate('xpack.ml.inference.modelsList.testModelActionLabel', {
        defaultMessage: 'Test model',
      }),
      icon: 'inputOutput',
      type: 'icon',
      isPrimary: true,
      available: isTestable,
      onClick: setShowTestFlyout,
      enabled: (item) => canTestTrainedModels && isTestEnabled(item),
    },
  ];

  return (
    <EuiPopover
      id={`${modelItem.model_id}-actions`}
      button={
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.ml.inference.modelsList.rowActions', {
            defaultMessage: 'Actions',
          })}
          iconType="boxesVertical"
          size="s"
          color="text"
          onClick={setIsPopoverOpen.bind(null, !isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={setIsPopoverOpen.bind(null, false)}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
    >
      <EuiContextMenuPanel
        initialFocusedItemIndex={0}
        items={actions
          .filter((action) => (action.available ? action.available(modelItem) : true))
          .map((action) => {
            return (
              <EuiContextMenuItem
                key={action.name as string}
                icon={action.icon as string}
                onClick={async () => {
                  if (action.onClick) {
                    await action.onClick(modelItem);
                  }
                  setIsPopoverOpen(false);
                }}
                disabled={action.enabled ? action.enabled(modelItem) : false}
                toolTipContent={'Test'}
              >
                {action.name}
              </EuiContextMenuItem>
            );
          })}
      />
    </EuiPopover>
  );
};

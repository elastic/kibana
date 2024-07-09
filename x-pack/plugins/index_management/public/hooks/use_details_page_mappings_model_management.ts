/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/inference_integration_flyout/types';
import { ModelDownloadState, TrainedModelStat } from '@kbn/ml-plugin/common/types/trained_models';
import {
  E5_LINUX_OPTIMIZED_MODEL_ID,
  ELSER_LINUX_OPTIMIZED_MODEL_ID,
  InferenceAPIConfigResponse,
} from '@kbn/ml-trained-models-utils';
import {
  InferenceServiceSettings,
  LocalInferenceServiceSettings,
} from '@kbn/ml-trained-models-utils/src/constants/trained_models';
import { useCallback } from 'react';
import { useAppContext } from '../application/app_context';
import { InferenceToModelIdMap } from '../application/components/mappings_editor/components/document_fields/fields';
import { useDispatch } from '../application/components/mappings_editor/mappings_state_context';
import { DefaultInferenceModels } from '../application/components/mappings_editor/types';
import { getInferenceEndpoints } from '../application/services/api';

function isLocalModel(model: InferenceServiceSettings): model is LocalInferenceServiceSettings {
  return Boolean((model as LocalInferenceServiceSettings).service_settings.model_id);
}

const getCustomInferenceIdMap = (
  models: InferenceAPIConfigResponse[],
  modelStatsById: Record<string, TrainedModelStat['deployment_stats'] | undefined>,
  downloadStates: Record<string, ModelDownloadState | undefined>
): InferenceToModelIdMap => {
  const inferenceIdMap = models.reduce<InferenceToModelIdMap>((inferenceMap, model) => {
    const inferenceEntry = isLocalModel(model)
      ? {
          trainedModelId: model.service_settings.model_id, // third-party models don't have trained model ids
          isDeployable: model.service === Service.elser || model.service === Service.elasticsearch,
          isDeployed: modelStatsById[model.service_settings.model_id]?.state === 'started',
          isDownloading: Boolean(downloadStates[model.service_settings.model_id]),
          modelStats: modelStatsById[model.service_settings.model_id],
        }
      : {
          trainedModelId: '',
          isDeployable: false,
          isDeployed: false,
          isDownloading: false,
          modelStats: undefined,
        };
    inferenceMap[model.model_id] = inferenceEntry;
    return inferenceMap;
  }, {});
  const defaultInferenceIds = {
    [DefaultInferenceModels.elser_model_2]: {
      trainedModelId: ELSER_LINUX_OPTIMIZED_MODEL_ID,
      isDeployable: true,
      isDeployed: modelStatsById[ELSER_LINUX_OPTIMIZED_MODEL_ID]?.state === 'started',
      isDownloading: Boolean(downloadStates[ELSER_LINUX_OPTIMIZED_MODEL_ID]),
      modelStats: modelStatsById[ELSER_LINUX_OPTIMIZED_MODEL_ID],
    },
    [DefaultInferenceModels.e5]: {
      trainedModelId: E5_LINUX_OPTIMIZED_MODEL_ID,
      isDeployable: true,
      isDeployed: modelStatsById[E5_LINUX_OPTIMIZED_MODEL_ID]?.state === 'started',
      isDownloading: Boolean(downloadStates[E5_LINUX_OPTIMIZED_MODEL_ID]),
      modelStats: modelStatsById[E5_LINUX_OPTIMIZED_MODEL_ID],
    },
  };
  return { ...defaultInferenceIds, ...inferenceIdMap };
};

export const useDetailsPageMappingsModelManagement = () => {
  const {
    plugins: { ml },
  } = useAppContext();

  const dispatch = useDispatch();

  const fetchInferenceToModelIdMap = useCallback<() => Promise<InferenceToModelIdMap>>(async () => {
    const inferenceModels = await getInferenceEndpoints();
    const trainedModelStats = await ml?.mlApi?.trainedModels.getTrainedModelStats();
    const downloadStates = await ml?.mlApi?.trainedModels.getModelsDownloadStatus();
    const modelStatsById =
      trainedModelStats?.trained_model_stats.reduce<
        Record<string, TrainedModelStat['deployment_stats'] | undefined>
      >((acc, { model_id: modelId, deployment_stats: stats }) => {
        if (modelId && stats) {
          acc[modelId] = stats;
        }
        return acc;
      }, {}) || {};
    const modelIdMap = getCustomInferenceIdMap(
      inferenceModels.data || [],
      modelStatsById,
      downloadStates || {}
    );

    dispatch({
      type: 'inferenceToModelIdMap.update',
      value: { inferenceToModelIdMap: modelIdMap },
    });
    return modelIdMap;
  }, [dispatch, ml?.mlApi?.trainedModels]);

  return {
    fetchInferenceToModelIdMap,
  };
};

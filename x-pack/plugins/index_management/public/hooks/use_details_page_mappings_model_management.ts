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
import { useCallback, useMemo } from 'react';
import { useAppContext } from '../application/app_context';
import { InferenceToModelIdMap } from '../application/components/mappings_editor/components/document_fields/fields';
import { deNormalize } from '../application/components/mappings_editor/lib';
import { useDispatch } from '../application/components/mappings_editor/mappings_state_context';
import {
  DefaultInferenceModels,
  Field,
  NormalizedFields,
  SemanticTextField,
} from '../application/components/mappings_editor/types';
import { getInferenceEndpoints } from '../application/services/api';

function isLocalModel(model: InferenceServiceSettings): model is LocalInferenceServiceSettings {
  return Boolean((model as LocalInferenceServiceSettings).service_settings.model_id);
}

const getCustomInferenceIdMap = (
  models: InferenceAPIConfigResponse[],
  modelStatsById: Record<string, TrainedModelStat | undefined>,
  downloadStates: Record<string, ModelDownloadState | undefined>
) => {
  const inferenceIdMap = models.reduce<InferenceToModelIdMap>((inferenceMap, model) => {
    inferenceMap[model.model_id] = {
      trainedModelId: isLocalModel(model) ? model.service_settings.model_id : '', // third-party models don't have trained model ids
      isDeployable: model.service === Service.elser || model.service === Service.elasticsearch,
      isDeployed: isLocalModel(model)
        ? modelStatsById[model.service_settings.model_id]?.deployment_stats?.state === 'started'
        : false,
      isDownloading: Boolean(downloadStates[model.model_id]),
      modelStats: isLocalModel(model) ? modelStatsById[model.service_settings.model_id] : undefined,
    };
    return inferenceMap;
  }, {});
  const defaultInferenceIds = {
    [DefaultInferenceModels.elser_model_2]: {
      trainedModelId: ELSER_LINUX_OPTIMIZED_MODEL_ID,
      isDeployable: true,
      isDeployed:
        modelStatsById[ELSER_LINUX_OPTIMIZED_MODEL_ID]?.deployment_stats?.state === 'started',
      isDownloading: Boolean(downloadStates[ELSER_LINUX_OPTIMIZED_MODEL_ID]),
      modelStats: modelStatsById[ELSER_LINUX_OPTIMIZED_MODEL_ID],
    },
    [DefaultInferenceModels.e5]: {
      trainedModelId: E5_LINUX_OPTIMIZED_MODEL_ID,
      isDeployable: true,
      isDeployed:
        modelStatsById[E5_LINUX_OPTIMIZED_MODEL_ID]?.deployment_stats?.state === 'started',
      isDownloading: Boolean(downloadStates[E5_LINUX_OPTIMIZED_MODEL_ID]),
      modelStats: modelStatsById[E5_LINUX_OPTIMIZED_MODEL_ID],
    },
  };
  return { ...defaultInferenceIds, ...inferenceIdMap };
};

function isSemanticTextField(field: Partial<Field>): field is SemanticTextField {
  return Boolean(field.inference_id && field.type === 'semantic_text');
}

export const useDetailsPageMappingsModelManagement = (
  fields: NormalizedFields,
  inferenceToModelIdMap?: InferenceToModelIdMap
) => {
  const {
    plugins: { ml },
  } = useAppContext();

  const dispatch = useDispatch();

  const fetchInferenceToModelIdMap = useCallback(async () => {
    const inferenceModels = await getInferenceEndpoints();
    const trainedModelStats = await ml?.mlApi?.trainedModels.getTrainedModelStats();
    const downloadStates = await ml?.mlApi?.trainedModels.getModelsDownloadStatus();
    const modelStatsById = Object.entries(trainedModelStats?.trained_model_stats || {}).reduce<
      Record<string, TrainedModelStat | undefined>
    >((acc, [modelId, stats]) => {
      acc[modelId] = stats;
      return acc;
    }, {});
    const modelIdMap = getCustomInferenceIdMap(
      inferenceModels.data || [],
      modelStatsById,
      downloadStates || {}
    );

    dispatch({
      type: 'inferenceToModelIdMap.update',
      value: { inferenceToModelIdMap: modelIdMap },
    });
  }, [dispatch, ml?.mlApi?.trainedModels]);

  const inferenceIdsInPendingList = useMemo(() => {
    return Object.values(deNormalize(fields))
      .filter(isSemanticTextField)
      .map((field) => field.inference_id);
  }, [fields]);

  const pendingDeployments = useMemo(() => {
    return inferenceIdsInPendingList
      .map((inferenceId) => {
        if (!inferenceId) {
          return undefined;
        }
        const trainedModelId = inferenceToModelIdMap?.[inferenceId]?.trainedModelId ?? '';
        return trainedModelId && !inferenceToModelIdMap?.[inferenceId]?.isDeployed
          ? trainedModelId
          : undefined;
      })
      .filter((trainedModelId) => !!trainedModelId);
  }, [inferenceIdsInPendingList, inferenceToModelIdMap]);

  return {
    pendingDeployments,
    fetchInferenceToModelIdMap,
  };
};

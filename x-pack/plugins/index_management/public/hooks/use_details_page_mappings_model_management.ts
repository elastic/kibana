/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchModelDefaultOptions, Service } from '@kbn/inference_integration_flyout/types';
import { InferenceStatsResponse } from '@kbn/ml-plugin/public/application/services/ml_api_service/trained_models';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { useCallback, useMemo } from 'react';
import { useAppContext } from '../application/app_context';
import { InferenceToModelIdMap } from '../application/components/mappings_editor/components/document_fields/fields';
import { deNormalize } from '../application/components/mappings_editor/lib';
import { useDispatch } from '../application/components/mappings_editor/mappings_state_context';
import {
  DefaultInferenceModels,
  DeploymentState,
  NormalizedFields,
} from '../application/components/mappings_editor/types';
import { getInferenceEndpoints } from '../application/services/api';

interface InferenceModel {
  data: InferenceAPIConfigResponse[];
}

type DeploymentStatusType = Record<string, DeploymentState>;

const getCustomInferenceIdMap = (
  deploymentStatsByModelId: DeploymentStatusType,
  models?: InferenceModel
) => {
  return models?.data.reduce<InferenceToModelIdMap>((inferenceMap, model) => {
    const inferenceId = model.model_id;

    const trainedModelId =
      'model_id' in model.service_settings &&
      (model.service_settings.model_id === ElasticsearchModelDefaultOptions.elser ||
        model.service_settings.model_id === ElasticsearchModelDefaultOptions.e5)
        ? model.service_settings.model_id
        : '';
    inferenceMap[inferenceId] = {
      trainedModelId,
      isDeployable: model.service === Service.elser || model.service === Service.elasticsearch,
      isDeployed: deploymentStatsByModelId[trainedModelId] === 'deployed',
    };
    return inferenceMap;
  }, {});
};

export const getTrainedModelStats = (modelStats?: InferenceStatsResponse): DeploymentStatusType => {
  return (
    modelStats?.trained_model_stats.reduce<DeploymentStatusType>((acc, modelStat) => {
      if (modelStat.model_id) {
        acc[modelStat.model_id] =
          modelStat?.deployment_stats?.state === 'started'
            ? DeploymentState.DEPLOYED
            : DeploymentState.NOT_DEPLOYED;
      }
      return acc;
    }, {}) || {}
  );
};

const getDefaultInferenceIds = (deploymentStatsByModelId: DeploymentStatusType) => {
  return {
    [DefaultInferenceModels.elser_model_2]: {
      trainedModelId: ElasticsearchModelDefaultOptions.elser,
      isDeployable: true,
      isDeployed:
        deploymentStatsByModelId[ElasticsearchModelDefaultOptions.elser] ===
        DeploymentState.DEPLOYED,
    },
    [DefaultInferenceModels.e5]: {
      trainedModelId: ElasticsearchModelDefaultOptions.e5,
      isDeployable: true,
      isDeployed:
        deploymentStatsByModelId[ElasticsearchModelDefaultOptions.e5] === DeploymentState.DEPLOYED,
    },
  };
};

export const useDetailsPageMappingsModelManagement = (
  fields: NormalizedFields,
  inferenceToModelIdMap?: InferenceToModelIdMap
) => {
  const {
    plugins: { ml },
  } = useAppContext();

  const dispatch = useDispatch();

  const fetchInferenceModelsAndTrainedModelStats = useCallback(async () => {
    const inferenceModels = await getInferenceEndpoints();

    const trainedModelStats = await ml?.mlApi?.trainedModels.getTrainedModelStats();

    return { inferenceModels, trainedModelStats };
  }, [ml]);

  const fetchInferenceToModelIdMap = useCallback(async () => {
    const { inferenceModels, trainedModelStats } = await fetchInferenceModelsAndTrainedModelStats();
    const deploymentStatsByModelId = getTrainedModelStats(trainedModelStats);
    const defaultInferenceIds = getDefaultInferenceIds(deploymentStatsByModelId);
    const modelIdMap = getCustomInferenceIdMap(deploymentStatsByModelId, inferenceModels);

    dispatch({
      type: 'inferenceToModelIdMap.update',
      value: { inferenceToModelIdMap: { ...defaultInferenceIds, ...modelIdMap } },
    });
  }, [dispatch, fetchInferenceModelsAndTrainedModelStats]);

  const inferenceIdsInPendingList = useMemo(() => {
    return Object.values(deNormalize(fields))
      .filter((field) => field.type === 'semantic_text' && field.inference_id)
      .map((field) => field.inference_id);
  }, [fields]);

  const pendingDeployments = useMemo(() => {
    return inferenceIdsInPendingList
      .map((inferenceId) => {
        if (inferenceId === undefined) {
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
    fetchInferenceModelsAndTrainedModelStats,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { InferenceStatsResponse } from '@kbn/ml-plugin/public/application/services/ml_api_service/trained_models';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { InferenceToModelIdMap } from '../../../../components/mappings_editor/components/document_fields/fields';
import { deNormalize } from '../../../../components/mappings_editor/lib';
import { useAppContext } from '../../../../app_context';
import { useComponentTemplatesContext } from '../../../../components/component_templates/component_templates_context';
import { State } from '../../../../components/mappings_editor/types';

interface InferenceModel {
  data: InferenceAPIConfigResponse[];
}

type DeploymentStatusType = Record<string, 'deployed' | 'not_deployed'>;

export const useDetailsPageMappingsContent = (state: State) => {
  const {
    plugins: { ml },
  } = useAppContext();

  const { api } = useComponentTemplatesContext();

  const { inferenceToModelIdMap } = state;

  const [pendingDeployments, setPendingDeployments] = useState<Set<string>>(new Set());
  const fetchInferenceModels = useCallback(async () => {
    return (await api.getInferenceModels()) as InferenceModel;
  }, [api]);

  const fetchTrainedModelStats = useCallback(async () => {
    return await ml?.mlApi?.trainedModels.getTrainedModelStats();
  }, [ml]);

  const fetchInferenceModelsAndTrainedModelStats = useCallback(async () => {
    const inferenceModels = fetchInferenceModels();
    const trainedModelStats = fetchTrainedModelStats();

    return Promise.all([inferenceModels, trainedModelStats]);
  }, [fetchInferenceModels, fetchTrainedModelStats]);

  const getTrainedModelStats = useCallback(
    (modelStats?: InferenceStatsResponse): DeploymentStatusType => {
      const deploymentStatsByModelId =
        modelStats?.trained_model_stats.reduce<DeploymentStatusType>((acc, modelStat) => {
          if (modelStat.model_id) {
            acc[modelStat.model_id] =
              modelStat?.deployment_stats?.state === 'started' ? 'deployed' : 'not_deployed';
          }
          return acc;
        }, {}) ?? {};

      return deploymentStatsByModelId;
    },
    []
  );

  const getDefaultInferenceIds = useCallback((deploymentStatsByModelId: DeploymentStatusType) => {
    return {
      elser_model_2: {
        trainedModelId: '.elser_model_2',
        isDeployed: deploymentStatsByModelId['.elser_model_2'] === 'deployed',
        defaultInferenceEndpoint: true,
      },
      e5: {
        trainedModelId: '.multilingual-e5-small',
        isDeployed: deploymentStatsByModelId['.multilingual-e5-small'] === 'deployed',
        defaultInferenceEndpoint: true,
      },
    };
  }, []);

  const getCustomInferenceIdMap = useCallback(
    (models: InferenceModel, deploymentStatsByModelId: DeploymentStatusType) => {
      return models.data.reduce<InferenceToModelIdMap>((inferenceMap, model) => {
        const inferenceId = model.model_id;
        const trainedModelId =
          'model_id' in model.service_settings ? model.service_settings.model_id : '';
        inferenceMap[inferenceId] = {
          trainedModelId,
          isDeployed: deploymentStatsByModelId[trainedModelId] === 'deployed',
          defaultInferenceEndpoint: false,
        };
        return inferenceMap;
      }, {});
    },
    []
  );

  const processInferenceToModelIdMap = useCallback(
    (models: InferenceModel, modelStats?: InferenceStatsResponse) => {
      const deploymentStatsByModelId = getTrainedModelStats(modelStats);
      const defaultInferenceIds = getDefaultInferenceIds(deploymentStatsByModelId);
      const modelIdMap = getCustomInferenceIdMap(models, deploymentStatsByModelId);
      return { ...defaultInferenceIds, ...modelIdMap };
    },
    [getCustomInferenceIdMap, getDefaultInferenceIds, getTrainedModelStats]
  );

  const getInferenceIdsInPendingList = useCallback(() => {
    const denormalizedFields = deNormalize(state.fields);

    const inferenceIdsInPendingList: Set<string> = new Set();
    for (const field of Object.values(denormalizedFields)) {
      if (field.type === 'semantic_text' && field.inference_id) {
        inferenceIdsInPendingList.add(field.inference_id as string);
      }
    }

    return inferenceIdsInPendingList;
  }, [state.fields]);

  const getPendingDeployments = useCallback(() => {
    const inferenceIdsInPendingList = getInferenceIdsInPendingList();
    const notDeployedTrainedModelIds = new Set<string>();

    if (inferenceIdsInPendingList.size > 0) {
      Array.from(inferenceIdsInPendingList).forEach((inferenceId: string) => {
        const trainedModelId = inferenceToModelIdMap?.[inferenceId]?.trainedModelId ?? '';
        if (trainedModelId && !inferenceToModelIdMap?.[inferenceId]?.isDeployed) {
          notDeployedTrainedModelIds.add(trainedModelId);
        }
      });
    }

    return notDeployedTrainedModelIds;
  }, [getInferenceIdsInPendingList, inferenceToModelIdMap]);

  return {
    getPendingDeployments,
    processInferenceToModelIdMap,
    fetchInferenceModelsAndTrainedModelStats,
    pendingDeployments,
    setPendingDeployments,
  };
};

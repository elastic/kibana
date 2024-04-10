/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { parseMlInferenceParametersFromPipeline } from '../../../../../../../common/ml_inference_pipeline';

import { getMLType } from '../../../shared/ml_inference/utils';

import {
  MLInferenceLogic,
  MLInferenceProcessorsActions,
  MLInferenceProcessorsValues,
} from './ml_inference_logic';
import { EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELDS } from './utils';

export interface MLInferencePipelineOption {
  disabled: boolean;
  disabledReason?: string;
  modelId: string;
  modelType: string;
  pipelineName: string;
  sourceFields: string[];
  indexFields: string[];
}

export interface PipelineSelectActions {
  selectExistingPipeline: (pipelineName: string) => {
    pipelineName: string;
  };
  setInferencePipelineConfiguration: MLInferenceProcessorsActions['setInferencePipelineConfiguration'];
}

export interface PipelineSelectValues {
  addInferencePipelineModal: MLInferenceProcessorsValues['addInferencePipelineModal'];
  existingInferencePipelines: MLInferencePipelineOption[];
  mlInferencePipelineProcessors: MLInferenceProcessorsValues['mlInferencePipelineProcessors'];
  mlInferencePipelinesData: MLInferenceProcessorsValues['mlInferencePipelinesData'];
  selectableModels: MLInferenceProcessorsValues['selectableModels'];
  sourceFields: MLInferenceProcessorsValues['sourceFields'];
}

export const PipelineSelectLogic = kea<MakeLogicType<PipelineSelectValues, PipelineSelectActions>>({
  actions: {
    selectExistingPipeline: (pipelineName: string) => ({ pipelineName }),
  },
  connect: {
    actions: [MLInferenceLogic, ['setInferencePipelineConfiguration']],
    values: [
      MLInferenceLogic,
      [
        'addInferencePipelineModal',
        'mlInferencePipelineProcessors',
        'mlInferencePipelinesData',
        'selectableModels',
        'selectedModel',
        'sourceFields',
      ],
    ],
  },
  path: ['enterprise_search', 'content', 'pipeline_select_logic'],
  listeners: ({ actions, values }) => ({
    selectExistingPipeline: ({ pipelineName }) => {
      const pipeline = values.mlInferencePipelinesData?.[pipelineName];
      if (!pipeline) return;
      const params = parseMlInferenceParametersFromPipeline(pipelineName, pipeline);
      if (params === null) return;
      actions.setInferencePipelineConfiguration({
        existingPipeline: true,
        modelID: params.model_id,
        pipelineName,
        fieldMappings: params.field_mappings,
        targetField: '',
      });
    },
  }),
  selectors: ({ selectors }) => ({
    existingInferencePipelines: [
      () => [
        selectors.mlInferencePipelinesData,
        selectors.sourceFields,
        selectors.selectableModels,
        selectors.mlInferencePipelineProcessors,
      ],
      (
        mlInferencePipelinesData: MLInferenceProcessorsValues['mlInferencePipelinesData'],
        indexFields: MLInferenceProcessorsValues['sourceFields'],
        selectableModels: MLInferenceProcessorsValues['selectableModels'],
        mlInferencePipelineProcessors: MLInferenceProcessorsValues['mlInferencePipelineProcessors']
      ) => {
        if (!mlInferencePipelinesData) {
          return [];
        }
        const indexProcessorNames =
          mlInferencePipelineProcessors?.map((processor) => processor.pipelineName) ?? [];

        const existingPipelines: MLInferencePipelineOption[] = Object.entries(
          mlInferencePipelinesData
        )
          .map(([pipelineName, pipeline]): MLInferencePipelineOption | undefined => {
            if (!pipeline || indexProcessorNames.includes(pipelineName)) return undefined;

            // Parse configuration from pipeline definition
            const pipelineParams = parseMlInferenceParametersFromPipeline(pipelineName, pipeline);
            if (!pipelineParams) return undefined;
            const { model_id: modelId, field_mappings: fieldMappings } = pipelineParams;

            const sourceFields = fieldMappings?.map((m) => m.sourceField) ?? [];
            const missingSourceFields = sourceFields.filter((f) => !indexFields?.includes(f)) ?? [];
            const mlModel = selectableModels.find((model) => model.modelId === modelId);
            const modelType = mlModel ? getMLType(mlModel.types) : '';
            const disabledReason =
              missingSourceFields.length > 0
                ? EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELDS(missingSourceFields.join(', '))
                : undefined;

            return {
              disabled: disabledReason !== undefined,
              disabledReason,
              modelId,
              modelType,
              pipelineName,
              sourceFields,
              indexFields: indexFields ?? [],
            };
          })
          .filter((p): p is MLInferencePipelineOption => p !== undefined);

        return existingPipelines;
      },
    ],
  }),
});

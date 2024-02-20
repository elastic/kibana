/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import {
  FieldMapping,
  formatPipelineName,
  generateMlInferencePipelineBody,
  getMlInferencePrefixedFieldName,
  ML_INFERENCE_PREFIX,
} from '../../../../../../../common/ml_inference_pipeline';
import { Status } from '../../../../../../../common/types/api';
import { MlModel } from '../../../../../../../common/types/ml';
import { MlInferencePipeline } from '../../../../../../../common/types/pipelines';
import { Actions } from '../../../../../shared/api_logic/create_api_logic';

import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';

import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicValues,
} from '../../../../api/index/cached_fetch_index_api_logic';
import {
  GetMappingsArgs,
  GetMappingsResponse,
  MappingsApiLogic,
} from '../../../../api/mappings/mappings_logic';
import {
  CachedFetchModelsApiLogic,
  CachedFetchModlesApiLogicActions,
  FetchModelsApiResponse,
} from '../../../../api/ml_models/cached_fetch_models_api_logic';
import {
  StartTextExpansionModelApiLogic,
  StartTextExpansionModelApiLogicActions,
} from '../../../../api/ml_models/text_expansion/start_text_expansion_model_api_logic';
import {
  AttachMlInferencePipelineApiLogic,
  AttachMlInferencePipelineApiLogicArgs,
  AttachMlInferencePipelineResponse,
} from '../../../../api/pipelines/attach_ml_inference_pipeline';
import {
  CreateMlInferencePipelineApiLogic,
  CreateMlInferencePipelineApiLogicArgs,
  CreateMlInferencePipelineResponse,
} from '../../../../api/pipelines/create_ml_inference_pipeline';
import {
  FetchMlInferencePipelineProcessorsApiLogic,
  FetchMlInferencePipelineProcessorsResponse,
} from '../../../../api/pipelines/fetch_ml_inference_pipeline_processors';
import {
  FetchMlInferencePipelinesApiLogic,
  FetchMlInferencePipelinesArgs,
  FetchMlInferencePipelinesResponse,
} from '../../../../api/pipelines/fetch_ml_inference_pipelines';
import {
  FetchPipelineApiLogic,
  FetchPipelineResponse,
  FetchPipelineApiLogicActions,
} from '../../../../api/pipelines/fetch_pipeline';

import { isConnectorIndex } from '../../../../utils/indices';
import { sortSourceFields } from '../../../shared/ml_inference/utils';
import { PipelinesLogic } from '../pipelines_logic';

import {
  AddInferencePipelineFormErrors,
  AddInferencePipelineSteps,
  InferencePipelineConfiguration,
} from './types';

import {
  validateInferencePipelineConfiguration,
  validateInferencePipelineFields,
  validatePipelineNameIsAvailable,
} from './utils';

export const EMPTY_PIPELINE_CONFIGURATION: InferencePipelineConfiguration = {
  modelID: '',
  pipelineName: '',
  targetField: '',
};

const API_REQUEST_COMPLETE_STATUSES = [Status.SUCCESS, Status.ERROR];
const DEFAULT_CONNECTOR_FIELDS = ['body', 'title', 'id', 'type', 'url'];

const getFullTargetFieldName = (
  sourceField: string,
  targetField: string | undefined,
  isTextExpansionModelSelected: boolean
) => {
  const suffixedTargetField = `${targetField || sourceField}${
    isTextExpansionModelSelected ? '_expanded' : ''
  }`;
  return getMlInferencePrefixedFieldName(suffixedTargetField);
};

export interface MLInferenceProcessorsActions {
  addSelectedFieldsToMapping: (isTextExpansionModelSelected: boolean) => {
    isTextExpansionModelSelected: boolean;
  };
  attachApiError: Actions<
    AttachMlInferencePipelineApiLogicArgs,
    AttachMlInferencePipelineResponse
  >['apiError'];
  attachApiSuccess: Actions<
    AttachMlInferencePipelineApiLogicArgs,
    AttachMlInferencePipelineResponse
  >['apiSuccess'];
  attachPipeline: () => void;
  clearFetchedPipeline: FetchPipelineApiLogicActions['apiReset'];
  clearModelPlaceholderFlag: (modelId: string) => { modelId: string };
  createApiError: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiError'];
  createApiSuccess: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiSuccess'];
  createPipeline: () => void;
  fetchModelsApiSuccess: CachedFetchModlesApiLogicActions['apiSuccess'];
  fetchPipelineByName: FetchPipelineApiLogicActions['makeRequest'];
  fetchPipelineSuccess: FetchPipelineApiLogicActions['apiSuccess'];
  makeAttachPipelineRequest: Actions<
    AttachMlInferencePipelineApiLogicArgs,
    AttachMlInferencePipelineResponse
  >['makeRequest'];
  makeCreatePipelineRequest: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['makeRequest'];
  makeMappingRequest: Actions<GetMappingsArgs, GetMappingsResponse>['makeRequest'];
  makeMlInferencePipelinesRequest: Actions<
    FetchMlInferencePipelinesArgs,
    FetchMlInferencePipelinesResponse
  >['makeRequest'];
  mappingsApiError: Actions<GetMappingsArgs, GetMappingsResponse>['apiError'];
  mlInferencePipelinesSuccess: Actions<
    FetchMlInferencePipelinesArgs,
    FetchMlInferencePipelinesResponse
  >['apiSuccess'];
  onAddInferencePipelineStepChange: (step: AddInferencePipelineSteps) => {
    step: AddInferencePipelineSteps;
  };
  removeFieldFromMapping: (fieldName: string) => { fieldName: string };
  selectFields: (fieldNames: string[]) => { fieldNames: string[] };
  setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => {
    step: AddInferencePipelineSteps;
  };
  setIndexName: (indexName: string) => { indexName: string };
  setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => {
    configuration: InferencePipelineConfiguration;
  };
  setTargetField: (targetFieldName: string) => { targetFieldName: string };
  startPollingModels: CachedFetchModlesApiLogicActions['startPolling'];
  startTextExpansionModelSuccess: StartTextExpansionModelApiLogicActions['apiSuccess'];
}

export interface AddInferencePipelineModal {
  configuration: InferencePipelineConfiguration;
  indexName: string;
  step: AddInferencePipelineSteps;
  selectedSourceFields?: string[] | undefined;
}

export interface MLInferenceProcessorsValues {
  addInferencePipelineModal: AddInferencePipelineModal;
  createErrors: string[];
  existingPipeline: FetchPipelineResponse | undefined;
  formErrors: AddInferencePipelineFormErrors;
  index: CachedFetchIndexApiLogicValues['indexData'];
  isConfigureStepValid: boolean;
  isLoading: boolean;
  isModelsInitialLoading: boolean;
  isPipelineDataValid: boolean;
  isTextExpansionModelSelected: boolean;
  mappingData: typeof MappingsApiLogic.values.data;
  mappingStatus: Status;
  mlInferencePipeline: MlInferencePipeline | undefined;
  mlInferencePipelineProcessors: FetchMlInferencePipelineProcessorsResponse | undefined;
  mlInferencePipelinesData: FetchMlInferencePipelinesResponse | undefined;
  modelsData: FetchModelsApiResponse | undefined;
  modelsStatus: Status;
  selectableModels: MlModel[];
  selectedModel: MlModel | undefined;
  sourceFields: string[] | undefined;
}

export const MLInferenceLogic = kea<
  MakeLogicType<MLInferenceProcessorsValues, MLInferenceProcessorsActions>
>({
  actions: {
    addSelectedFieldsToMapping: (isTextExpansionModelSelected: string) => ({
      isTextExpansionModelSelected,
    }),
    attachPipeline: true,
    clearFormErrors: true,
    clearModelPlaceholderFlag: (modelId: string) => ({ modelId }),
    createPipeline: true,
    onAddInferencePipelineStepChange: (step: AddInferencePipelineSteps) => ({ step }),
    removeFieldFromMapping: (fieldName: string) => ({ fieldName }),
    selectFields: (fieldNames: string[]) => ({ fieldNames }),
    setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => ({ step }),
    setIndexName: (indexName: string) => ({ indexName }),
    setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => ({
      configuration,
    }),
    setTargetField: (targetFieldName: string) => ({ targetFieldName }),
  },
  connect: {
    actions: [
      CachedFetchModelsApiLogic,
      ['apiSuccess as fetchModelsApiSuccess', 'startPolling as startPollingModels'],
      FetchMlInferencePipelinesApiLogic,
      [
        'makeRequest as makeMlInferencePipelinesRequest',
        'apiSuccess as mlInferencePipelinesSuccess',
      ],
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest', 'apiError as mappingsApiError'],
      CreateMlInferencePipelineApiLogic,
      [
        'apiError as createApiError',
        'apiSuccess as createApiSuccess',
        'makeRequest as makeCreatePipelineRequest',
      ],
      AttachMlInferencePipelineApiLogic,
      [
        'apiError as attachApiError',
        'apiSuccess as attachApiSuccess',
        'makeRequest as makeAttachPipelineRequest',
      ],
      PipelinesLogic,
      ['closeAddMlInferencePipelineModal'],
      StartTextExpansionModelApiLogic,
      ['apiSuccess as startTextExpansionModelSuccess'],
      FetchPipelineApiLogic,
      [
        'apiReset as clearFetchedPipeline',
        'makeRequest as fetchPipelineByName',
        'apiSuccess as fetchPipelineSuccess',
      ],
    ],
    values: [
      CachedFetchModelsApiLogic,
      ['modelsData', 'status as modelsStatus', 'isInitialLoading as isModelsInitialLoading'],
      CachedFetchIndexApiLogic,
      ['indexData as index'],
      FetchMlInferencePipelinesApiLogic,
      ['data as mlInferencePipelinesData'],
      MappingsApiLogic,
      ['data as mappingData', 'status as mappingStatus'],
      FetchMlInferencePipelineProcessorsApiLogic,
      ['data as mlInferencePipelineProcessors'],
      FetchPipelineApiLogic,
      ['data as existingPipeline'],
    ],
  },
  listeners: ({ values, actions }) => ({
    attachPipeline: () => {
      const {
        addInferencePipelineModal: {
          configuration: { pipelineName },
          indexName,
        },
      } = values;

      actions.makeAttachPipelineRequest({
        indexName,
        pipelineName,
      });
    },
    clearModelPlaceholderFlag: ({ modelId }) => {
      const {
        addInferencePipelineModal: { configuration },
      } = values;

      // Don't change the flag if the user clicked away from the selected model
      if (modelId !== configuration.modelID) return;

      actions.setInferencePipelineConfiguration({
        ...configuration,
        isModelPlaceholderSelected: false,
      });
    },
    createPipeline: () => {
      const {
        addInferencePipelineModal: { configuration, indexName },
        mlInferencePipeline, // Full pipeline definition
      } = values;

      actions.makeCreatePipelineRequest({
        indexName,
        fieldMappings: configuration.fieldMappings ?? [],
        modelId: configuration.modelID,
        pipelineDefinition: mlInferencePipeline!,
        pipelineName: configuration.pipelineName,
      });
    },
    mlInferencePipelinesSuccess: (data) => {
      if (
        (data?.length ?? 0) === 0 &&
        values.addInferencePipelineModal.configuration.existingPipeline === undefined
      ) {
        // Default to a new pipeline if there are no existing pipelines to choose
        actions.setInferencePipelineConfiguration({
          ...values.addInferencePipelineModal.configuration,
          existingPipeline: false,
        });
      }
    },
    startTextExpansionModelSuccess: () => {
      // Refresh ML models list when the text expansion model is started
      actions.startPollingModels();
    },
    onAddInferencePipelineStepChange: ({ step }) => {
      const {
        addInferencePipelineModal: {
          configuration: { pipelineName, existingPipeline },
          step: currentStep,
        },
      } = values;
      if (currentStep === AddInferencePipelineSteps.Configuration && !existingPipeline) {
        // Validate name is not in use
        actions.fetchPipelineByName({
          pipelineName: `ml-inference-${formatPipelineName(pipelineName)}`,
        });
        // Continue to the next step so we don't have to save it to state, we will change
        // back to the Configuration step if we find a pipeline with the same name

        // Re-fetch ML model list to include those that were deployed in this step
        actions.startPollingModels();
      }
      actions.setAddInferencePipelineStep(step);
    },
    fetchPipelineSuccess: () => {
      // We found a pipeline with the name, go back to configuration step
      actions.setAddInferencePipelineStep(AddInferencePipelineSteps.Configuration);
    },
  }),
  path: ['enterprise_search', 'content', 'pipelines_add_ml_inference_pipeline'],
  reducers: {
    addInferencePipelineModal: [
      {
        configuration: {
          ...EMPTY_PIPELINE_CONFIGURATION,
        },
        indexName: '',
        step: AddInferencePipelineSteps.Configuration,
      },
      {
        addSelectedFieldsToMapping: (modal, { isTextExpansionModelSelected }) => {
          const {
            configuration: { fieldMappings, targetField },
            selectedSourceFields,
          } = modal;

          const mergedFieldMappings: FieldMapping[] = [
            ...(fieldMappings || []),
            ...(selectedSourceFields || []).map((fieldName: string) => ({
              sourceField: fieldName,
              targetField: getFullTargetFieldName(
                fieldName,
                targetField,
                isTextExpansionModelSelected
              ),
            })),
          ];

          return {
            ...modal,
            configuration: {
              ...modal.configuration,
              fieldMappings: mergedFieldMappings,
              targetField: '',
            },
            selectedSourceFields: [],
          };
        },
        closeAddMlInferencePipelineModal: () => ({
          configuration: {
            ...EMPTY_PIPELINE_CONFIGURATION,
          },
          indexName: '',
          step: AddInferencePipelineSteps.Configuration,
        }),
        createApiSuccess: () => ({
          configuration: {
            ...EMPTY_PIPELINE_CONFIGURATION,
          },
          indexName: '',
          step: AddInferencePipelineSteps.Configuration,
        }),
        removeFieldFromMapping: (modal, { fieldName }) => {
          const {
            configuration: { fieldMappings },
          } = modal;

          if (!fieldMappings) {
            return modal;
          }

          return {
            ...modal,
            configuration: {
              ...modal.configuration,
              fieldMappings: fieldMappings?.filter(({ sourceField }) => sourceField !== fieldName),
            },
          };
        },
        selectFields: (modal, { fieldNames }) => ({
          ...modal,
          configuration: {
            ...modal.configuration,
          },
          selectedSourceFields: fieldNames,
        }),
        setAddInferencePipelineStep: (modal, { step }) => ({ ...modal, step }),
        setIndexName: (modal, { indexName }) => ({ ...modal, indexName }),
        setInferencePipelineConfiguration: (modal, { configuration }) => ({
          ...modal,
          configuration,
        }),
        setTargetField: (modal, { targetFieldName }) => ({
          ...modal,
          configuration: {
            ...modal.configuration,
            targetField: targetFieldName,
          },
        }),
      },
    ],
    createErrors: [
      [],
      {
        attachApiError: (_, error) => getErrorsFromHttpResponse(error),
        createApiError: (_, error) => getErrorsFromHttpResponse(error),
        makeAttachPipelineRequest: () => [],
        makeCreatePipelineRequest: () => [],
      },
    ],
  },
  selectors: ({ selectors }) => ({
    formErrors: [
      () => [selectors.addInferencePipelineModal, selectors.existingPipeline],
      (
        modal: AddInferencePipelineModal,
        existingPipeline: MLInferenceProcessorsValues['existingPipeline']
      ) => ({
        ...validateInferencePipelineConfiguration(modal.configuration),
        ...validateInferencePipelineFields(modal.configuration),
        ...validatePipelineNameIsAvailable(existingPipeline),
      }),
    ],
    isConfigureStepValid: [
      () => [selectors.addInferencePipelineModal],
      (modal: AddInferencePipelineModal) => {
        const errors = validateInferencePipelineConfiguration(modal.configuration);

        return Object.keys(errors).length === 0;
      },
    ],
    isLoading: [
      () => [selectors.mappingStatus],
      (mappingStatus: Status) => !API_REQUEST_COMPLETE_STATUSES.includes(mappingStatus),
    ],
    isPipelineDataValid: [
      () => [selectors.formErrors],
      (errors: AddInferencePipelineFormErrors) => Object.keys(errors).length === 0,
    ],
    isTextExpansionModelSelected: [
      () => [selectors.selectedModel],
      (model: MlModel | null) => model?.type === 'text_expansion',
    ],
    mlInferencePipeline: [
      () => [
        selectors.isPipelineDataValid,
        selectors.addInferencePipelineModal,
        selectors.modelsData,
        selectors.mlInferencePipelinesData,
      ],
      (
        isPipelineDataValid: MLInferenceProcessorsValues['isPipelineDataValid'],
        { configuration }: MLInferenceProcessorsValues['addInferencePipelineModal'],
        models: MLInferenceProcessorsValues['modelsData'],
        mlInferencePipelinesData: MLInferenceProcessorsValues['mlInferencePipelinesData']
      ) => {
        if (configuration.existingPipeline) {
          if (configuration.pipelineName.length === 0) {
            return undefined;
          }
          const pipeline = mlInferencePipelinesData?.[configuration.pipelineName];
          if (!pipeline) {
            return undefined;
          }
          return pipeline as MlInferencePipeline;
        }
        if (!isPipelineDataValid) return undefined;
        const model = models?.find((mlModel) => mlModel.modelId === configuration.modelID);
        if (!model) return undefined;

        return generateMlInferencePipelineBody({
          model,
          pipelineName: `${ML_INFERENCE_PREFIX}${configuration.pipelineName}`,
          fieldMappings: configuration.fieldMappings ?? [],
          inferenceConfig: configuration.inferenceConfig,
        });
      },
    ],
    sourceFields: [
      () => [selectors.mappingStatus, selectors.mappingData, selectors.index],
      (
        status: Status,
        mapping: IndicesGetMappingIndexMappingRecord,
        index: MLInferenceProcessorsValues['index']
      ) => {
        if (status !== Status.SUCCESS) return;
        if (mapping?.mappings?.properties === undefined) {
          if (isConnectorIndex(index)) {
            return DEFAULT_CONNECTOR_FIELDS;
          }
          return [];
        }
        return Object.entries(mapping.mappings.properties)
          .reduce((fields, [key, value]) => {
            if (value.type === 'text' || value.type === 'keyword') {
              fields.push(key);
            }
            return fields;
          }, [] as string[])
          .sort(sortSourceFields);
      },
    ],
    selectableModels: [
      () => [selectors.modelsData],
      (response: FetchModelsApiResponse) => response ?? [],
    ],
    selectedModel: [
      () => [selectors.selectableModels, selectors.addInferencePipelineModal],
      (
        models: MlModel[],
        addInferencePipelineModal: MLInferenceProcessorsValues['addInferencePipelineModal']
      ) => models.find((m) => m.modelId === addInferencePipelineModal.configuration.modelID),
    ],
  }),
});

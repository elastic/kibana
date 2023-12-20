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
  getMlModelTypesForModelConfig,
  ML_INFERENCE_PREFIX,
  parseMlInferenceParametersFromPipeline,
} from '../../../../../../../common/ml_inference_pipeline';
import { Status } from '../../../../../../../common/types/api';
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
  TrainedModel,
  TrainedModelsApiLogicActions,
  TrainedModelsApiLogic,
} from '../../../../api/ml_models/ml_trained_models_logic';
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
import {
  getMLType,
  isSupportedMLModel,
  sortModels,
  sortSourceFields,
} from '../../../shared/ml_inference/utils';
import { PipelinesLogic } from '../pipelines_logic';

import {
  AddInferencePipelineFormErrors,
  AddInferencePipelineSteps,
  InferencePipelineConfiguration,
} from './types';

import {
  EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELDS,
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

export interface MLInferencePipelineOption {
  disabled: boolean;
  disabledReason?: string;
  modelId: string;
  modelType: string;
  pipelineName: string;
  sourceFields: string[];
  indexFields: string[];
}

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
  createApiError: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiError'];
  createApiSuccess: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiSuccess'];
  createPipeline: () => void;
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
  makeMLModelsRequest: TrainedModelsApiLogicActions['makeRequest'];
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
  mlModelsApiError: TrainedModelsApiLogicActions['apiError'];
  onAddInferencePipelineStepChange: (step: AddInferencePipelineSteps) => {
    step: AddInferencePipelineSteps;
  };
  removeFieldFromMapping: (fieldName: string) => { fieldName: string };
  selectExistingPipeline: (pipelineName: string) => {
    pipelineName: string;
  };
  selectFields: (fieldNames: string[]) => { fieldNames: string[] };
  setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => {
    step: AddInferencePipelineSteps;
  };
  setIndexName: (indexName: string) => { indexName: string };
  setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => {
    configuration: InferencePipelineConfiguration;
  };
  setTargetField: (targetFieldName: string) => { targetFieldName: string };
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
  existingInferencePipelines: MLInferencePipelineOption[];
  formErrors: AddInferencePipelineFormErrors;
  index: CachedFetchIndexApiLogicValues['indexData'];
  isConfigureStepValid: boolean;
  isLoading: boolean;
  isPipelineDataValid: boolean;
  isTextExpansionModelSelected: boolean;
  mappingData: typeof MappingsApiLogic.values.data;
  mappingStatus: Status;
  mlInferencePipeline: MlInferencePipeline | undefined;
  mlInferencePipelineProcessors: FetchMlInferencePipelineProcessorsResponse | undefined;
  mlInferencePipelinesData: FetchMlInferencePipelinesResponse | undefined;
  mlModelsData: TrainedModel[] | null;
  mlModelsStatus: Status;
  selectedMLModel: TrainedModel | null;
  sourceFields: string[] | undefined;
  supportedMLModels: TrainedModel[];
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
    createPipeline: true,
    onAddInferencePipelineStepChange: (step: AddInferencePipelineSteps) => ({ step }),
    removeFieldFromMapping: (fieldName: string) => ({ fieldName }),
    selectExistingPipeline: (pipelineName: string) => ({ pipelineName }),
    selectFields: (fieldNames: string[]) => ({ fieldNames }),
    setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => ({ step }),
    setFormErrors: (inputErrors: AddInferencePipelineFormErrors) => ({ inputErrors }),
    setIndexName: (indexName: string) => ({ indexName }),
    setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => ({
      configuration,
    }),
    setTargetField: (targetFieldName: string) => ({ targetFieldName }),
  },
  connect: {
    actions: [
      FetchMlInferencePipelinesApiLogic,
      [
        'makeRequest as makeMlInferencePipelinesRequest',
        'apiSuccess as mlInferencePipelinesSuccess',
      ],
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest', 'apiError as mappingsApiError'],
      TrainedModelsApiLogic,
      ['makeRequest as makeMLModelsRequest', 'apiError as mlModelsApiError'],
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
      ['closeAddMlInferencePipelineModal as closeAddMlInferencePipelineModal'],
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
      CachedFetchIndexApiLogic,
      ['indexData as index'],
      FetchMlInferencePipelinesApiLogic,
      ['data as mlInferencePipelinesData'],
      MappingsApiLogic,
      ['data as mappingData', 'status as mappingStatus'],
      TrainedModelsApiLogic,
      ['data as mlModelsData', 'status as mlModelsStatus'],
      FetchMlInferencePipelineProcessorsApiLogic,
      ['data as mlInferencePipelineProcessors'],
      FetchPipelineApiLogic,
      ['data as existingPipeline'],
    ],
  },
  events: {},
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
    setIndexName: ({ indexName }) => {
      actions.makeMlInferencePipelinesRequest(undefined);
      actions.makeMLModelsRequest(undefined);
      actions.makeMappingRequest({ indexName });
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
      actions.makeMLModelsRequest(undefined);
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
      }
      actions.setAddInferencePipelineStep(step);
    },
    fetchPipelineSuccess: () => {
      // We found a pipeline with the name go back to configuration step
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
      () => [selectors.mlModelsStatus, selectors.mappingStatus],
      (mlModelsStatus, mappingStatus) =>
        !API_REQUEST_COMPLETE_STATUSES.includes(mlModelsStatus) ||
        !API_REQUEST_COMPLETE_STATUSES.includes(mappingStatus),
    ],
    isPipelineDataValid: [
      () => [selectors.formErrors],
      (errors: AddInferencePipelineFormErrors) => Object.keys(errors).length === 0,
    ],
    isTextExpansionModelSelected: [
      () => [selectors.selectedMLModel],
      (model: TrainedModel | null) => !!model?.inference_config?.text_expansion,
    ],
    mlInferencePipeline: [
      () => [
        selectors.isPipelineDataValid,
        selectors.addInferencePipelineModal,
        selectors.mlModelsData,
        selectors.mlInferencePipelinesData,
      ],
      (
        isPipelineDataValid: MLInferenceProcessorsValues['isPipelineDataValid'],
        { configuration }: MLInferenceProcessorsValues['addInferencePipelineModal'],
        models: MLInferenceProcessorsValues['mlModelsData'],
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
        const model = models?.find((mlModel) => mlModel.model_id === configuration.modelID);
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
    supportedMLModels: [
      () => [selectors.mlModelsData],
      (mlModelsData: MLInferenceProcessorsValues['mlModelsData']) => {
        return (mlModelsData?.filter(isSupportedMLModel) ?? []).sort(sortModels);
      },
    ],
    existingInferencePipelines: [
      () => [
        selectors.mlInferencePipelinesData,
        selectors.sourceFields,
        selectors.supportedMLModels,
        selectors.mlInferencePipelineProcessors,
      ],
      (
        mlInferencePipelinesData: MLInferenceProcessorsValues['mlInferencePipelinesData'],
        indexFields: MLInferenceProcessorsValues['sourceFields'],
        supportedMLModels: MLInferenceProcessorsValues['supportedMLModels'],
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
            const mlModel = supportedMLModels.find((model) => model.model_id === modelId);
            const modelType = mlModel ? getMLType(getMlModelTypesForModelConfig(mlModel)) : '';
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
    selectedMLModel: [
      () => [selectors.supportedMLModels, selectors.addInferencePipelineModal],
      (
        supportedMLModels: MLInferenceProcessorsValues['supportedMLModels'],
        addInferencePipelineModal: MLInferenceProcessorsValues['addInferencePipelineModal']
      ) => {
        return (
          supportedMLModels.find(
            (model) => model.model_id === addInferencePipelineModal.configuration.modelID
          ) ?? null
        );
      },
    ],
  }),
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import {
  formatPipelineName,
  generateMlInferencePipelineBody,
  getMlModelTypesForModelConfig,
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

import { isConnectorIndex } from '../../../../utils/indices';
import {
  getMLType,
  isSupportedMLModel,
  sortSourceFields,
} from '../../../shared/ml_inference/utils';

import {
  AddInferencePipelineFormErrors,
  AddInferencePipelineSteps,
  InferencePipelineConfiguration,
} from './types';

import {
  validateInferencePipelineConfiguration,
  EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELD,
  EXISTING_PIPELINE_DISABLED_PIPELINE_EXISTS,
} from './utils';

export const EMPTY_PIPELINE_CONFIGURATION: InferencePipelineConfiguration = {
  destinationField: '',
  modelID: '',
  pipelineName: '',
  sourceField: '',
};

const API_REQUEST_COMPLETE_STATUSES = [Status.SUCCESS, Status.ERROR];
const DEFAULT_CONNECTOR_FIELDS = ['body', 'title', 'id', 'type', 'url'];

export interface MLInferencePipelineOption {
  destinationField: string;
  disabled: boolean;
  disabledReason?: string;
  modelId: string;
  modelType: string;
  pipelineName: string;
  sourceField: string;
}

interface MLInferenceProcessorsActions {
  attachApiError: Actions<
    AttachMlInferencePipelineApiLogicArgs,
    AttachMlInferencePipelineResponse
  >['apiError'];
  attachApiSuccess: Actions<
    AttachMlInferencePipelineApiLogicArgs,
    AttachMlInferencePipelineResponse
  >['apiSuccess'];
  attachPipeline: () => void;
  createApiError: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiError'];
  createApiSuccess: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiSuccess'];
  createPipeline: () => void;
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
  mlModelsApiError: TrainedModelsApiLogicActions['apiError'];
  selectExistingPipeline: (pipelineName: string) => {
    pipelineName: string;
  };
  setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => {
    step: AddInferencePipelineSteps;
  };
  setIndexName: (indexName: string) => { indexName: string };
  setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => {
    configuration: InferencePipelineConfiguration;
  };
}

export interface AddInferencePipelineModal {
  configuration: InferencePipelineConfiguration;
  indexName: string;
  step: AddInferencePipelineSteps;
}

export interface MLInferenceProcessorsValues {
  addInferencePipelineModal: AddInferencePipelineModal;
  createErrors: string[];
  existingInferencePipelines: MLInferencePipelineOption[];
  formErrors: AddInferencePipelineFormErrors;
  index: CachedFetchIndexApiLogicValues['indexData'];
  isLoading: boolean;
  isPipelineDataValid: boolean;
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
    attachPipeline: true,
    clearFormErrors: true,
    createPipeline: true,
    selectExistingPipeline: (pipelineName: string) => ({ pipelineName }),
    setAddInferencePipelineStep: (step: AddInferencePipelineSteps) => ({ step }),
    setFormErrors: (inputErrors: AddInferencePipelineFormErrors) => ({ inputErrors }),
    setIndexName: (indexName: string) => ({ indexName }),
    setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => ({
      configuration,
    }),
  },
  connect: {
    actions: [
      FetchMlInferencePipelinesApiLogic,
      ['makeRequest as makeMlInferencePipelinesRequest'],
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
      } = values;

      actions.makeCreatePipelineRequest({
        destinationField:
          configuration.destinationField.trim().length > 0
            ? configuration.destinationField
            : undefined,
        indexName,
        inferenceConfig: configuration.inferenceConfig,
        modelId: configuration.modelID,
        pipelineName: configuration.pipelineName,
        sourceField: configuration.sourceField,
      });
    },
    selectExistingPipeline: ({ pipelineName }) => {
      const pipeline = values.mlInferencePipelinesData?.[pipelineName];
      if (!pipeline) return;
      const params = parseMlInferenceParametersFromPipeline(pipelineName, pipeline);
      if (params === null) return;
      actions.setInferencePipelineConfiguration({
        destinationField: params.destination_field ?? '',
        existingPipeline: true,
        modelID: params.model_id,
        pipelineName,
        sourceField: params.source_field,
      });
    },
    setIndexName: ({ indexName }) => {
      actions.makeMlInferencePipelinesRequest(undefined);
      actions.makeMLModelsRequest(undefined);
      actions.makeMappingRequest({ indexName });
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
        setAddInferencePipelineStep: (modal, { step }) => ({ ...modal, step }),
        setIndexName: (modal, { indexName }) => ({ ...modal, indexName }),
        setInferencePipelineConfiguration: (modal, { configuration }) => ({
          ...modal,
          configuration,
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
      () => [selectors.addInferencePipelineModal],
      (modal: AddInferencePipelineModal) =>
        validateInferencePipelineConfiguration(modal.configuration),
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
          destinationField:
            configuration.destinationField || formatPipelineName(configuration.pipelineName),
          model,
          pipelineName: configuration.pipelineName,
          sourceField: configuration.sourceField,
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
        return mlModelsData?.filter(isSupportedMLModel) ?? [];
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
        sourceFields: MLInferenceProcessorsValues['sourceFields'],
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
            if (!pipeline) return undefined;
            const pipelineParams = parseMlInferenceParametersFromPipeline(pipelineName, pipeline);
            if (!pipelineParams) return undefined;
            const {
              destination_field: destinationField,
              model_id: modelId,
              source_field: sourceField,
            } = pipelineParams;

            let disabled: boolean = false;
            let disabledReason: string | undefined;
            if (!(sourceFields?.includes(sourceField) ?? false)) {
              disabled = true;
              disabledReason = EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELD;
            } else if (indexProcessorNames.includes(pipelineName)) {
              disabled = true;
              disabledReason = EXISTING_PIPELINE_DISABLED_PIPELINE_EXISTS;
            }
            const mlModel = supportedMLModels.find((model) => model.model_id === modelId);
            const modelType = mlModel ? getMLType(getMlModelTypesForModelConfig(mlModel)) : '';

            return {
              destinationField: destinationField ?? '',
              disabled,
              disabledReason,
              modelId,
              modelType,
              pipelineName,
              sourceField,
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

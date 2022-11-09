/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { IngestSimulateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

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
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from '../../../../api/index/fetch_index_api_logic';
import {
  GetMappingsArgs,
  GetMappingsResponse,
  MappingsApiLogic,
} from '../../../../api/mappings/mappings_logic';
import {
  GetMlModelsArgs,
  GetMlModelsResponse,
  MLModelsApiLogic,
} from '../../../../api/ml_models/ml_models_logic';
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
  SimulateExistingMlInterfacePipelineApiLogic,
  SimulateExistingMlInterfacePipelineArgs,
  SimulateExistingMlInterfacePipelineResponse,
} from '../../../../api/pipelines/simulate_existing_ml_inference_pipeline';
import {
  SimulateMlInterfacePipelineApiLogic,
  SimulateMlInterfacePipelineArgs,
  SimulateMlInterfacePipelineResponse,
} from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import { isConnectorIndex } from '../../../../utils/indices';
import {
  getMLType,
  isSupportedMLModel,
  sortSourceFields,
} from '../../../shared/ml_inference/utils';

import { AddInferencePipelineFormErrors, InferencePipelineConfiguration } from './types';

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

export enum AddInferencePipelineSteps {
  Configuration,
  Test,
  Review,
}

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
  makeMLModelsRequest: Actions<GetMlModelsArgs, GetMlModelsResponse>['makeRequest'];
  makeMappingRequest: Actions<GetMappingsArgs, GetMappingsResponse>['makeRequest'];
  makeMlInferencePipelinesRequest: Actions<
    FetchMlInferencePipelinesArgs,
    FetchMlInferencePipelinesResponse
  >['makeRequest'];
  makeSimulateExistingPipelineRequest: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['makeRequest'];
  makeSimulatePipelineRequest: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['makeRequest'];
  mappingsApiError: Actions<GetMappingsArgs, GetMappingsResponse>['apiError'];
  mlModelsApiError: Actions<GetMlModelsArgs, GetMlModelsResponse>['apiError'];
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
  setPipelineSimulateBody: (simulateBody: string) => {
    simulateBody: string;
  };
  setSimulatePipelineErrors(errors: string[]): { errors: string[] };
  simulateExistingPipelineApiError: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['apiError'];
  simulateExistingPipelineApiReset: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['apiReset'];
  simulateExistingPipelineApiSuccess: Actions<
    SimulateExistingMlInterfacePipelineArgs,
    SimulateExistingMlInterfacePipelineResponse
  >['apiSuccess'];
  simulatePipeline: () => void;
  simulatePipelineApiError: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['apiError'];
  simulatePipelineApiReset: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['apiReset'];
  simulatePipelineApiSuccess: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['apiSuccess'];
}

export interface AddInferencePipelineModal {
  configuration: InferencePipelineConfiguration;
  indexName: string;
  simulateBody: string;
  step: AddInferencePipelineSteps;
}

export interface MLInferenceProcessorsValues {
  addInferencePipelineModal: AddInferencePipelineModal;
  createErrors: string[];
  existingInferencePipelines: MLInferencePipelineOption[];
  formErrors: AddInferencePipelineFormErrors;
  index: FetchIndexApiResponse | undefined;
  isLoading: boolean;
  isPipelineDataValid: boolean;
  mappingData: typeof MappingsApiLogic.values.data;
  mappingStatus: Status;
  mlInferencePipeline: MlInferencePipeline | undefined;
  mlInferencePipelineProcessors: FetchMlInferencePipelineProcessorsResponse | undefined;
  mlInferencePipelinesData: FetchMlInferencePipelinesResponse | undefined;
  mlModelsData: TrainedModelConfigResponse[] | undefined;
  mlModelsStatus: Status;
  simulateExistingPipelineData: typeof SimulateExistingMlInterfacePipelineApiLogic.values.data;
  simulateExistingPipelineStatus: Status;
  simulatePipelineData: typeof SimulateMlInterfacePipelineApiLogic.values.data;
  simulatePipelineErrors: string[];
  simulatePipelineResult: IngestSimulateResponse | undefined;
  simulatePipelineStatus: Status;
  sourceFields: string[] | undefined;
  supportedMLModels: TrainedModelConfigResponse[];
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
    setPipelineSimulateBody: (simulateBody: string) => ({
      simulateBody,
    }),
    setSimulatePipelineErrors: (errors: string[]) => ({ errors }),
    simulatePipeline: true,
  },
  connect: {
    actions: [
      FetchMlInferencePipelinesApiLogic,
      ['makeRequest as makeMlInferencePipelinesRequest'],
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest', 'apiError as mappingsApiError'],
      MLModelsApiLogic,
      ['makeRequest as makeMLModelsRequest', 'apiError as mlModelsApiError'],
      SimulateExistingMlInterfacePipelineApiLogic,
      [
        'makeRequest as makeSimulateExistingPipelineRequest',
        'apiSuccess as simulateExistingPipelineApiSuccess',
        'apiError as simulateExistingPipelineApiError',
        'apiReset as simulateExistingPipelineApiReset',
      ],
      SimulateMlInterfacePipelineApiLogic,
      [
        'makeRequest as makeSimulatePipelineRequest',
        'apiSuccess as simulatePipelineApiSuccess',
        'apiError as simulatePipelineApiError',
        'apiReset as simulatePipelineApiReset',
      ],
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
      FetchIndexApiLogic,
      ['data as index'],
      FetchMlInferencePipelinesApiLogic,
      ['data as mlInferencePipelinesData'],
      MappingsApiLogic,
      ['data as mappingData', 'status as mappingStatus'],
      MLModelsApiLogic,
      ['data as mlModelsData', 'status as mlModelsStatus'],
      SimulateExistingMlInterfacePipelineApiLogic,
      ['data as simulateExistingPipelineData', 'status as simulateExistingPipelineStatus'],
      SimulateMlInterfacePipelineApiLogic,
      ['data as simulatePipelineData', 'status as simulatePipelineStatus'],
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
    simulatePipeline: () => {
      if (values.mlInferencePipeline) {
        actions.setSimulatePipelineErrors([]);
        actions.simulateExistingPipelineApiReset();
        actions.simulatePipelineApiReset();
        const { configuration } = values.addInferencePipelineModal;
        if (configuration.existingPipeline) {
          actions.makeSimulateExistingPipelineRequest({
            docs: values.addInferencePipelineModal.simulateBody,
            indexName: values.addInferencePipelineModal.indexName,
            pipelineName: configuration.pipelineName,
          });
        } else {
          actions.makeSimulatePipelineRequest({
            docs: values.addInferencePipelineModal.simulateBody,
            indexName: values.addInferencePipelineModal.indexName,
            pipeline: values.mlInferencePipeline,
          });
        }
      }
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
        simulateBody: `
[
  {
    "_index": "index",
    "_id": "id",
    "_source": {
      "foo": "bar"
    }
  },
  {
    "_index": "index",
    "_id": "id",
    "_source": {
      "foo": "baz"
    }
  }
]`,
        step: AddInferencePipelineSteps.Configuration,
      },
      {
        setAddInferencePipelineStep: (modal, { step }) => ({ ...modal, step }),
        setIndexName: (modal, { indexName }) => ({ ...modal, indexName }),
        setInferencePipelineConfiguration: (modal, { configuration }) => ({
          ...modal,
          configuration,
        }),
        setPipelineSimulateBody: (modal, { simulateBody }) => ({
          ...modal,
          simulateBody,
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
    simulatePipelineErrors: [
      [],
      {
        setSimulatePipelineErrors: (_, { errors }) => errors,
        simulatePipelineApiError: (_, error) => getErrorsFromHttpResponse(error),
        simulateExistingPipelineApiError: (_, error) => getErrorsFromHttpResponse(error),
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
        });
      },
    ],
    simulatePipelineResult: [
      () => [
        selectors.simulatePipelineStatus,
        selectors.simulatePipelineData,
        selectors.simulateExistingPipelineStatus,
        selectors.simulateExistingPipelineData,
      ],
      (
        status: Status,
        simulateResult: IngestSimulateResponse | undefined,
        exStatus: Status,
        exSimulateResult: IngestSimulateResponse | undefined
      ) => {
        if (exStatus === Status.SUCCESS) return exSimulateResult;
        if (status === Status.SUCCESS) return simulateResult;
        return undefined;
      },
    ],
    sourceFields: [
      () => [selectors.mappingStatus, selectors.mappingData, selectors.index],
      (
        status: Status,
        mapping: IndicesGetMappingIndexMappingRecord,
        index: FetchIndexApiResponse
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
      (mlModelsData: TrainedModelConfigResponse[] | undefined) => {
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
  }),
});

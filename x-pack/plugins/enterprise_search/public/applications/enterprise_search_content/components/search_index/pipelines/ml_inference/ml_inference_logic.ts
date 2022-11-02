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
} from '../../../../../../../common/ml_inference_pipeline';
import { Status } from '../../../../../../../common/types/api';
import { MlInferencePipeline } from '../../../../../../../common/types/pipelines';
import { Actions } from '../../../../../shared/api_logic/create_api_logic';

import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicValues,
} from '../../../../api/index/fetch_index_wrapper_logic';
import {
  GetMappingsArgs,
  GetMappingsResponse,
  MappingsApiLogic,
} from '../../../../api/mappings/mappings_logic';
import {
  CreateMlInferencePipelineApiLogic,
  CreateMlInferencePipelineApiLogicArgs,
  CreateMlInferencePipelineResponse,
} from '../../../../api/ml_models/create_ml_inference_pipeline';
import {
  GetMlModelsArgs,
  GetMlModelsResponse,
  MLModelsApiLogic,
} from '../../../../api/ml_models/ml_models_logic';
import {
  SimulateMlInterfacePipelineApiLogic,
  SimulateMlInterfacePipelineArgs,
  SimulateMlInterfacePipelineResponse,
} from '../../../../api/pipelines/simulate_ml_inference_pipeline_processors';

import { isConnectorIndex } from '../../../../utils/indices';
import { isSupportedMLModel, sortSourceFields } from '../../../shared/ml_inference/utils';

import { AddInferencePipelineFormErrors, InferencePipelineConfiguration } from './types';

import { validateInferencePipelineConfiguration } from './utils';

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

interface MLInferenceProcessorsActions {
  createApiError: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiError'];
  createApiSuccess: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['apiSuccess'];
  createPipeline: () => void;
  makeCreatePipelineRequest: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
  >['makeRequest'];
  makeMLModelsRequest: Actions<GetMlModelsArgs, GetMlModelsResponse>['makeRequest'];
  makeMappingRequest: Actions<GetMappingsArgs, GetMappingsResponse>['makeRequest'];
  makeSimulatePipelineRequest: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['makeRequest'];
  mappingsApiError: Actions<GetMappingsArgs, GetMappingsResponse>['apiError'];
  mlModelsApiError: Actions<GetMlModelsArgs, GetMlModelsResponse>['apiError'];
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
  simulatePipeline: () => void;
  simulatePipelineApiError: Actions<
    SimulateMlInterfacePipelineArgs,
    SimulateMlInterfacePipelineResponse
  >['apiError'];
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

interface MLInferenceProcessorsValues {
  addInferencePipelineModal: AddInferencePipelineModal;
  createErrors: string[];
  formErrors: AddInferencePipelineFormErrors;
  index: CachedFetchIndexApiLogicValues['indexData'];
  isLoading: boolean;
  isPipelineDataValid: boolean;
  mappingData: typeof MappingsApiLogic.values.data;
  mappingStatus: Status;
  mlInferencePipeline?: MlInferencePipeline;
  mlModelsData: TrainedModelConfigResponse[];
  mlModelsStatus: Status;
  simulatePipelineData: typeof SimulateMlInterfacePipelineApiLogic.values.data;
  simulatePipelineErrors: string[];
  simulatePipelineResult: IngestSimulateResponse;
  simulatePipelineStatus: Status;
  sourceFields: string[] | undefined;
  supportedMLModels: TrainedModelConfigResponse[];
}

export const MLInferenceLogic = kea<
  MakeLogicType<MLInferenceProcessorsValues, MLInferenceProcessorsActions>
>({
  actions: {
    clearFormErrors: true,
    createPipeline: true,
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
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest', 'apiError as mappingsApiError'],
      MLModelsApiLogic,
      ['makeRequest as makeMLModelsRequest', 'apiError as mlModelsApiError'],
      SimulateMlInterfacePipelineApiLogic,
      [
        'makeRequest as makeSimulatePipelineRequest',
        'apiSuccess as simulatePipelineApiSuccess',
        'apiError as simulatePipelineApiError',
      ],
      CreateMlInferencePipelineApiLogic,
      [
        'apiError as createApiError',
        'apiSuccess as createApiSuccess',
        'makeRequest as makeCreatePipelineRequest',
      ],
    ],
    values: [
      CachedFetchIndexApiLogic,
      ['fetchIndexApiData as index'],
      MappingsApiLogic,
      ['data as mappingData', 'status as mappingStatus'],
      MLModelsApiLogic,
      ['data as mlModelsData', 'status as mlModelsStatus'],
      SimulateMlInterfacePipelineApiLogic,
      ['data as simulatePipelineData', 'status as simulatePipelineStatus'],
    ],
  },
  events: {},
  listeners: ({ values, actions }) => ({
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
    setIndexName: ({ indexName }) => {
      actions.makeMLModelsRequest(undefined);
      actions.makeMappingRequest({ indexName });
    },
    simulatePipeline: () => {
      if (values.mlInferencePipeline) {
        actions.setSimulatePipelineErrors([]);
        actions.makeSimulatePipelineRequest({
          docs: values.addInferencePipelineModal.simulateBody,
          indexName: values.addInferencePipelineModal.indexName,
          pipeline: values.mlInferencePipeline,
        });
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
        createApiError: (_, error) => getErrorsFromHttpResponse(error),
        makeCreatePipelineRequest: () => [],
      },
    ],
    simulatePipelineErrors: [
      [],
      {
        setSimulatePipelineErrors: (_, { errors }) => errors,
        simulatePipelineApiError: (_, error) => getErrorsFromHttpResponse(error),
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
      ],
      (
        isPipelineDataValid: boolean,
        { configuration }: AddInferencePipelineModal,
        models: MLInferenceProcessorsValues['mlModelsData']
      ) => {
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
      () => [selectors.simulatePipelineStatus, selectors.simulatePipelineData],
      (status: Status, simulateResult: IngestSimulateResponse | undefined) => {
        if (status !== Status.SUCCESS) return undefined;
        return simulateResult;
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
      (mlModelsData: TrainedModelConfigResponse[] | undefined) => {
        return mlModelsData?.filter(isSupportedMLModel);
      },
    ],
  }),
});

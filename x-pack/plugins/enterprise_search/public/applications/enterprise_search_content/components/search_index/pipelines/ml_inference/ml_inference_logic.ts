/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { HttpError, Status } from '../../../../../../../common/types/api';

import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
import { KibanaLogic } from '../../../../../shared/kibana';
import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { CreateMlInferencePipelineApiLogic } from '../../../../api/ml_models/create_ml_inference_pipeline';
import { MLModelsApiLogic } from '../../../../api/ml_models/ml_models_logic';

import { SEARCH_INDEX_TAB_PATH } from '../../../../routes';
import { SearchIndexTabId } from '../../search_index';

import { AddInferencePipelineFormErrors, InferencePipelineConfiguration } from './types';
import {
  isSupportedMLModel,
  sortSourceFields,
  validateInferencePipelineConfiguration,
} from './utils';

export const EMPTY_PIPELINE_CONFIGURATION: InferencePipelineConfiguration = {
  destinationField: '',
  modelID: '',
  pipelineName: '',
  sourceField: '',
};

const API_REQUEST_COMPLETE_STATUSES = [Status.SUCCESS, Status.ERROR];

interface MLInferenceProcessorsActions {
  clearFormErrors: () => void;
  createApiError: (error: HttpError) => HttpError;
  createApiSuccess: typeof CreateMlInferencePipelineApiLogic.actions.apiSuccess;
  createPipeline: () => void;
  makeCreatePipelineRequest: typeof CreateMlInferencePipelineApiLogic.actions.makeRequest;
  makeMLModelsRequest: typeof MLModelsApiLogic.actions.makeRequest;
  makeMappingRequest: typeof MappingsApiLogic.actions.makeRequest;
  mappingsApiError(error: HttpError): HttpError;
  mlModelsApiError(error: HttpError): HttpError;
  setCreateErrors(errors: string[]): { errors: string[] };
  setFormErrors: (inputErrors: AddInferencePipelineFormErrors) => {
    inputErrors: AddInferencePipelineFormErrors;
  };
  setIndexName: (indexName: string) => { indexName: string };
  setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => {
    configuration: InferencePipelineConfiguration;
  };
}

export interface AddInferencePipelineModal {
  configuration: InferencePipelineConfiguration;
  indexName: string;
}

interface MLInferenceProcessorsValues {
  addInferencePipelineModal: AddInferencePipelineModal;
  createErrors: string[];
  formErrors: AddInferencePipelineFormErrors;
  isLoading: boolean;
  mappingData: typeof MappingsApiLogic.values.data;
  mappingStatus: Status;
  mlModelsData: typeof MLModelsApiLogic.values.data;
  mlModelsStatus: typeof MLModelsApiLogic.values.apiStatus;
  sourceFields: string[] | undefined;
  supportedMLModels: typeof MLModelsApiLogic.values.data;
}

export const MLInferenceLogic = kea<
  MakeLogicType<MLInferenceProcessorsValues, MLInferenceProcessorsActions>
>({
  actions: {
    clearFormErrors: true,
    createPipeline: true,
    setCreateErrors: (errors: string[]) => ({ errors }),
    setFormErrors: (inputErrors: AddInferencePipelineFormErrors) => ({ inputErrors }),
    setIndexName: (indexName: string) => ({ indexName }),
    setInferencePipelineConfiguration: (configuration: InferencePipelineConfiguration) => ({
      configuration,
    }),
  },
  connect: {
    actions: [
      MappingsApiLogic,
      ['makeRequest as makeMappingRequest', 'apiError as mappingsApiError'],
      MLModelsApiLogic,
      ['makeRequest as makeMLModelsRequest', 'apiError as mlModelsApiError'],
      CreateMlInferencePipelineApiLogic,
      [
        'apiError as createApiError',
        'apiSuccess as createApiSuccess',
        'makeRequest as makeCreatePipelineRequest',
      ],
    ],
    values: [
      MappingsApiLogic,
      ['data as mappingData', 'status as mappingStatus'],
      MLModelsApiLogic,
      ['data as mlModelsData', 'status as mlModelsStatus'],
    ],
  },
  events: {},
  listeners: ({ values, actions }) => ({
    createApiSuccess: () => {
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName: values.addInferencePipelineModal.indexName,
          tabId: SearchIndexTabId.PIPELINES,
        })
      );
    },
    createPipeline: () => {
      const {
        addInferencePipelineModal: { configuration, indexName },
      } = values;
      const validationErrors = validateInferencePipelineConfiguration(configuration);
      if (validationErrors !== undefined) {
        actions.setFormErrors(validationErrors);
        return;
      }
      actions.clearFormErrors();

      actions.makeCreatePipelineRequest({
        indexName,
        pipelineName: configuration.pipelineName,
        modelId: configuration.modelID,
        sourceField: configuration.sourceField,
        destinationField:
          configuration.destinationField.trim().length > 0
            ? configuration.destinationField
            : undefined,
      });
    },
    makeCreatePipelineRequest: () => actions.setCreateErrors([]),
    setIndexName: ({ indexName }) => {
      actions.makeMLModelsRequest(undefined);
      actions.makeMappingRequest({ indexName });
    },
  }),
  reducers: {
    addInferencePipelineModal: [
      {
        configuration: {
          ...EMPTY_PIPELINE_CONFIGURATION,
        },
        indexName: '',
      },
      {
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
        createApiError: (_, error) => getErrorsFromHttpResponse(error),
        setCreateErrors: (_, { errors }) => errors,
      },
    ],
    formErrors: [
      {},
      {
        clearFormErrors: () => ({}),
        setFormErrors: (_, { inputErrors }) => inputErrors,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.mlModelsStatus, selectors.mappingStatus],
      (mlModelsStatus, mappingStatus) =>
        !API_REQUEST_COMPLETE_STATUSES.includes(mlModelsStatus) ||
        !API_REQUEST_COMPLETE_STATUSES.includes(mappingStatus),
    ],
    sourceFields: [
      () => [selectors.mappingStatus, selectors.mappingData],
      (status: Status, mapping: IndicesGetMappingIndexMappingRecord) => {
        if (status !== Status.SUCCESS) return;
        if (mapping?.mappings?.properties === undefined) return [];
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

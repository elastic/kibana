/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';

import { DEFAULT_PIPELINE_VALUES } from '../../../../../../common/constants';

import { HttpError } from '../../../../../../common/types/api';
import { IngestPipelineParams } from '../../../../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../../../../common/types/indices';
import { InferencePipeline } from '../../../../../../common/types/pipelines';
import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../../shared/flash_messages';

import {
  FetchDefaultPipelineApiLogic,
  FetchDefaultPipelineResponse,
} from '../../../api/connector/get_default_pipeline_api_logic';
import {
  PostPipelineArgs,
  PostPipelineResponse,
  UpdatePipelineApiLogic,
} from '../../../api/connector/update_pipeline_api_logic';
import {
  CreateCustomPipelineApiLogic,
  CreateCustomPipelineApiLogicArgs,
  CreateCustomPipelineApiLogicResponse,
} from '../../../api/index/create_custom_pipeline_api_logic';
import {
  FetchCustomPipelineApiLogicArgs,
  FetchCustomPipelineApiLogicResponse,
  FetchCustomPipelineApiLogic,
} from '../../../api/index/fetch_custom_pipeline_api_logic';
import {
  FetchIndexApiLogic,
  FetchIndexApiParams,
  FetchIndexApiResponse,
} from '../../../api/index/fetch_index_api_logic';
import { CreateMlInferencePipelineApiLogic } from '../../../api/ml_models/create_ml_inference_pipeline';
import {
  DeleteMlInferencePipelineApiLogic,
  DeleteMlInferencePipelineApiLogicArgs,
  DeleteMlInferencePipelineResponse,
} from '../../../api/ml_models/delete_ml_inference_pipeline';
import { FetchMlInferencePipelineProcessorsApiLogic } from '../../../api/pipelines/fetch_ml_inference_pipeline_processors';
import { isApiIndex, isConnectorIndex, isCrawlerIndex } from '../../../utils/indices';

type PipelinesActions = Pick<
  Actions<PostPipelineArgs, PostPipelineResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  closeAddMlInferencePipelineModal: () => void;
  closeModal: () => void;
  createCustomPipeline: Actions<
    CreateCustomPipelineApiLogicArgs,
    CreateCustomPipelineApiLogicResponse
  >['makeRequest'];
  createCustomPipelineError: Actions<
    CreateCustomPipelineApiLogicArgs,
    CreateCustomPipelineApiLogicResponse
  >['apiError'];
  createCustomPipelineSuccess: Actions<
    CreateCustomPipelineApiLogicArgs,
    CreateCustomPipelineApiLogicResponse
  >['apiSuccess'];
  deleteMlPipeline: Actions<
    DeleteMlInferencePipelineApiLogicArgs,
    DeleteMlInferencePipelineResponse
  >['makeRequest'];
  deleteMlPipelineError: Actions<
    DeleteMlInferencePipelineApiLogicArgs,
    DeleteMlInferencePipelineResponse
  >['apiError'];
  deleteMlPipelineSuccess: Actions<
    DeleteMlInferencePipelineApiLogicArgs,
    DeleteMlInferencePipelineResponse
  >['apiSuccess'];
  fetchCustomPipeline: Actions<
    FetchCustomPipelineApiLogicArgs,
    FetchCustomPipelineApiLogicResponse
  >['makeRequest'];
  fetchCustomPipelineSuccess: Actions<
    FetchCustomPipelineApiLogicArgs,
    FetchCustomPipelineApiLogicResponse
  >['apiSuccess'];
  fetchDefaultPipeline: Actions<undefined, FetchDefaultPipelineResponse>['makeRequest'];
  fetchDefaultPipelineSuccess: Actions<undefined, FetchDefaultPipelineResponse>['apiSuccess'];
  fetchIndexApiSuccess: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiSuccess'];
  fetchMlInferenceProcessors: typeof FetchMlInferencePipelineProcessorsApiLogic.actions.makeRequest;
  fetchMlInferenceProcessorsApiError: (error: HttpError) => HttpError;
  openAddMlInferencePipelineModal: () => void;
  openModal: () => void;
  savePipeline: () => void;
  setPipelineState(pipeline: IngestPipelineParams): {
    pipeline: IngestPipelineParams;
  };
};

interface PipelinesValues {
  canSetPipeline: boolean;
  canUseMlInferencePipeline: boolean;
  customPipelineData: Record<string, IngestPipeline | undefined>;
  defaultPipelineValues: IngestPipelineParams;
  defaultPipelineValuesData: IngestPipelineParams | null;
  hasIndexIngestionPipeline: boolean;
  index: FetchIndexApiResponse;
  indexName: string;
  mlInferencePipelineProcessors: InferencePipeline[];
  pipelineName: string;
  pipelineState: IngestPipelineParams;
  showAddMlInferencePipelineModal: boolean;
  showModal: boolean;
}

export const PipelinesLogic = kea<MakeLogicType<PipelinesValues, PipelinesActions>>({
  actions: {
    closeAddMlInferencePipelineModal: true,
    closeModal: true,
    openAddMlInferencePipelineModal: true,
    openModal: true,
    savePipeline: true,
    setPipelineState: (pipeline: IngestPipelineParams) => ({ pipeline }),
  },
  connect: {
    actions: [
      CreateCustomPipelineApiLogic,
      [
        'apiError as createCustomPipelineError',
        'apiSuccess as createCustomPipelineSuccess',
        'makeRequest as createCustomPipeline',
      ],
      UpdatePipelineApiLogic,
      ['apiSuccess', 'apiError', 'makeRequest'],
      FetchIndexApiLogic,
      ['apiSuccess as fetchIndexApiSuccess'],
      FetchDefaultPipelineApiLogic,
      ['apiSuccess as fetchDefaultPipelineSuccess', 'makeRequest as fetchDefaultPipeline'],
      FetchCustomPipelineApiLogic,
      ['apiSuccess as fetchCustomPipelineSuccess', 'makeRequest as fetchCustomPipeline'],
      FetchMlInferencePipelineProcessorsApiLogic,
      [
        'makeRequest as fetchMlInferenceProcessors',
        'apiError as fetchMlInferenceProcessorsApiError',
      ],
      CreateMlInferencePipelineApiLogic,
      ['apiSuccess as createMlInferencePipelineSuccess'],
      DeleteMlInferencePipelineApiLogic,
      [
        'apiError as deleteMlPipelineError',
        'apiSuccess as deleteMlPipelineSuccess',
        'makeRequest as deleteMlPipeline',
      ],
    ],
    values: [
      FetchCustomPipelineApiLogic,
      ['data as customPipelineData'],
      FetchDefaultPipelineApiLogic,
      ['data as defaultPipelineValuesData'],
      FetchIndexApiLogic,
      ['data as index'],
      FetchMlInferencePipelineProcessorsApiLogic,
      ['data as mlInferencePipelineProcessors'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      actions.fetchDefaultPipeline(undefined);
      actions.setPipelineState(
        isConnectorIndex(values.index) || isCrawlerIndex(values.index)
          ? values.index.connector?.pipeline ?? values.defaultPipelineValues
          : values.defaultPipelineValues
      );
    },
  }),
  listeners: ({ actions, values }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: ({ pipeline }) => {
      if (isConnectorIndex(values.index) || isCrawlerIndex(values.index)) {
        if (values.index.connector) {
          // had to split up these if checks rather than nest them or typescript wouldn't recognize connector as defined
          actions.fetchIndexApiSuccess({
            ...values.index,
            connector: { ...values.index.connector, pipeline },
          });
        }
      }
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.content.indices.pipelines.successToast.title', {
          defaultMessage: 'Pipelines successfully updated',
        })
      );
    },
    closeModal: () =>
      actions.setPipelineState(
        isConnectorIndex(values.index) || isCrawlerIndex(values.index)
          ? values.index.connector?.pipeline ?? values.defaultPipelineValues
          : values.defaultPipelineValues
      ),
    createCustomPipelineError: (error) => flashAPIErrors(error),
    createCustomPipelineSuccess: ({ created }) => {
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.successToastCustom.title',
          {
            defaultMessage: 'Custom pipeline successfully created',
          }
        )
      );
      actions.setPipelineState({ ...values.pipelineState, name: created[0] });
      actions.savePipeline();
      actions.fetchCustomPipeline({ indexName: values.index.name });
    },
    createMlInferencePipelineSuccess: () => {
      actions.fetchMlInferenceProcessors({ indexName: values.index.name });
    },
    deleteMlPipelineError: (error) => flashAPIErrors(error),
    deleteMlPipelineSuccess: (value) => {
      if (value.deleted) {
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.successToastDeleteMlPipeline.title',
            {
              defaultMessage: 'Deleted machine learning inference pipeline "{pipelineName}"',
              values: {
                pipelineName: value.deleted,
              },
            }
          )
        );
      }
      actions.fetchMlInferenceProcessors({ indexName: values.index.name });
    },
    fetchIndexApiSuccess: (index) => {
      if (!values.showModal) {
        // Don't do this when the modal is open to avoid overwriting the values while editing
        const pipeline =
          isConnectorIndex(index) || isCrawlerIndex(index)
            ? index.connector?.pipeline
            : values.defaultPipelineValues;
        actions.setPipelineState(pipeline ?? values.defaultPipelineValues);
      }
    },
    makeRequest: () => clearFlashMessages(),
    openModal: () => {
      const pipeline =
        isCrawlerIndex(values.index) || isConnectorIndex(values.index)
          ? values.index.connector?.pipeline
          : values.defaultPipelineValues;
      actions.setPipelineState(pipeline ?? values.defaultPipelineValues);
    },
    savePipeline: () => {
      if (isConnectorIndex(values.index) || isCrawlerIndex(values.index)) {
        if (values.index.connector) {
          actions.makeRequest({
            connectorId: values.index.connector?.id,
            pipeline: values.pipelineState,
          });
        }
      }
    },
  }),
  path: ['enterprise_search', 'content', 'pipelines'],
  reducers: () => ({
    pipelineState: [
      DEFAULT_PIPELINE_VALUES,
      {
        setPipelineState: (_, { pipeline }) => pipeline,
      },
    ],
    showAddMlInferencePipelineModal: [
      false,
      {
        closeAddMlInferencePipelineModal: () => false,
        createMlInferencePipelineSuccess: () => false,
        openAddMlInferencePipelineModal: () => true,
      },
    ],
    showModal: [
      false,
      {
        apiSuccess: () => false,
        closeModal: () => false,
        openModal: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    canSetPipeline: [
      () => [selectors.index],
      (index: ElasticsearchIndexWithIngestion) => !isApiIndex(index),
    ],
    canUseMlInferencePipeline: [
      () => [selectors.hasIndexIngestionPipeline, selectors.pipelineState, selectors.index],
      (
        hasIndexIngestionPipeline: boolean,
        pipelineState: IngestPipelineParams,
        index: ElasticsearchIndexWithIngestion
      ) => hasIndexIngestionPipeline && (pipelineState.run_ml_inference || isApiIndex(index)),
    ],
    defaultPipelineValues: [
      () => [selectors.defaultPipelineValuesData],
      (pipeline: IngestPipelineParams | null) => pipeline ?? DEFAULT_PIPELINE_VALUES,
    ],
    hasIndexIngestionPipeline: [
      () => [selectors.pipelineName, selectors.defaultPipelineValues],
      (pipelineName: string, defaultPipelineValues: IngestPipelineParams) =>
        pipelineName !== defaultPipelineValues.name,
    ],
    indexName: [
      () => [selectors.index],
      (index?: ElasticsearchIndexWithIngestion) => index?.name ?? '',
    ],
    pipelineName: [
      () => [selectors.pipelineState, selectors.customPipelineData, selectors.indexName],
      (pipelineState, customPipelineData, indexName) =>
        customPipelineData && customPipelineData[indexName] ? indexName : pipelineState.name,
    ],
  }),
});

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
import { flashSuccessToast } from '../../../../shared/flash_messages';

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
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicValues,
  CachedFetchIndexApiLogicActions,
} from '../../../api/index/cached_fetch_index_api_logic';
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
  AttachMlInferencePipelineApiLogic,
  AttachMlInferencePipelineApiLogicArgs,
  AttachMlInferencePipelineResponse,
} from '../../../api/pipelines/attach_ml_inference_pipeline';
import {
  CreateMlInferencePipelineApiLogic,
  CreateMlInferencePipelineApiLogicArgs,
  CreateMlInferencePipelineResponse,
} from '../../../api/pipelines/create_ml_inference_pipeline';
import {
  DeleteMlInferencePipelineApiLogic,
  DeleteMlInferencePipelineApiLogicArgs,
  DeleteMlInferencePipelineResponse,
} from '../../../api/pipelines/delete_ml_inference_pipeline';
import {
  DetachMlInferencePipelineApiLogic,
  DetachMlInferencePipelineApiLogicArgs,
  DetachMlInferencePipelineResponse,
} from '../../../api/pipelines/detach_ml_inference_pipeline';

import { FetchMlInferencePipelineProcessorsApiLogic } from '../../../api/pipelines/fetch_ml_inference_pipeline_processors';
import { isApiIndex, isConnectorIndex, isCrawlerIndex } from '../../../utils/indices';

type PipelinesActions = Pick<
  Actions<PostPipelineArgs, PostPipelineResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  attachMlInferencePipelineSuccess: Actions<
    AttachMlInferencePipelineApiLogicArgs,
    AttachMlInferencePipelineResponse
  >['apiSuccess'];
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
  createMlInferencePipelineSuccess: Actions<
    CreateMlInferencePipelineApiLogicArgs,
    CreateMlInferencePipelineResponse
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
  detachMlPipeline: Actions<
    DetachMlInferencePipelineApiLogicArgs,
    DetachMlInferencePipelineResponse
  >['makeRequest'];
  detachMlPipelineError: Actions<
    DetachMlInferencePipelineApiLogicArgs,
    DetachMlInferencePipelineResponse
  >['apiError'];
  detachMlPipelineSuccess: Actions<
    DetachMlInferencePipelineApiLogicArgs,
    DetachMlInferencePipelineResponse
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
  fetchIndexApiSuccess: CachedFetchIndexApiLogicActions['apiSuccess'];
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
  index: CachedFetchIndexApiLogicValues['fetchIndexApiData'];
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
      CachedFetchIndexApiLogic,
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
      AttachMlInferencePipelineApiLogic,
      ['apiSuccess as attachMlInferencePipelineSuccess'],
      CreateMlInferencePipelineApiLogic,
      ['apiSuccess as createMlInferencePipelineSuccess'],
      DeleteMlInferencePipelineApiLogic,
      [
        'apiError as deleteMlPipelineError',
        'apiSuccess as deleteMlPipelineSuccess',
        'makeRequest as deleteMlPipeline',
      ],
      DetachMlInferencePipelineApiLogic,
      [
        'apiError as detachMlPipelineError',
        'apiSuccess as detachMlPipelineSuccess',
        'makeRequest as detachMlPipeline',
      ],
    ],
    values: [
      FetchCustomPipelineApiLogic,
      ['data as customPipelineData'],
      FetchDefaultPipelineApiLogic,
      ['data as defaultPipelineValuesData'],
      CachedFetchIndexApiLogic,
      ['fetchIndexApiData as index'],
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
    },
    attachMlInferencePipelineSuccess: () => {
      // Re-fetch processors to ensure we display newly added ml processor
      actions.fetchMlInferenceProcessors({ indexName: values.index.name });
      // Needed to ensure correct JSON is available in the JSON configurations tab
      actions.fetchCustomPipeline({ indexName: values.index.name });
    },
    closeModal: () =>
      actions.setPipelineState(
        isConnectorIndex(values.index) || isCrawlerIndex(values.index)
          ? values.index.connector?.pipeline ?? values.defaultPipelineValues
          : values.defaultPipelineValues
      ),
    createCustomPipelineSuccess: ({ created }) => {
      actions.setPipelineState({ ...values.pipelineState, name: created[0] });
      actions.savePipeline();
      actions.fetchCustomPipeline({ indexName: values.index.name });
    },
    createMlInferencePipelineSuccess: () => {
      // Re-fetch processors to ensure we display newly added ml processor
      actions.fetchMlInferenceProcessors({ indexName: values.index.name });
      // Needed to ensure correct JSON is available in the JSON configurations tab
      actions.fetchCustomPipeline({ indexName: values.index.name });
    },
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
      // Re-fetch processors to ensure we display newly removed ml processor
      actions.fetchMlInferenceProcessors({ indexName: values.index.name });
      // Needed to ensure correct JSON is available in the JSON configurations tab
      actions.fetchCustomPipeline({ indexName: values.index.name });
    },
    detachMlPipelineSuccess: (response) => {
      if (response.updated) {
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.successToastDetachMlPipeline.title',
            {
              defaultMessage: 'Detached machine learning inference pipeline from "{pipelineName}"',
              values: {
                pipelineName: response.updated,
              },
            }
          )
        );
      }
      // Re-fetch processors to ensure we display newly removed ml processor
      actions.fetchMlInferenceProcessors({ indexName: values.index.name });
      // Needed to ensure correct JSON is available in the JSON configurations tab
      actions.fetchCustomPipeline({ indexName: values.index.name });
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
        attachMlInferencePipelineSuccess: () => false,
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

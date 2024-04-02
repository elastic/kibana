/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'react-fast-compare';

import { kea, MakeLogicType } from 'kea';

import { IngestPipelineParams } from '@kbn/search-connectors';

import { DEFAULT_PIPELINE_VALUES } from '../../../../../common/constants';
import { Status } from '../../../../../common/types/api';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import { KibanaLogic } from '../../../shared/kibana';

import {
  FetchDefaultPipelineApiLogic,
  FetchDefaultPipelineResponse,
} from '../../api/connector/get_default_pipeline_api_logic';
import {
  PostDefaultPipelineArgs,
  PostDefaultPipelineResponse,
  UpdateDefaultPipelineApiLogic,
} from '../../api/connector/update_default_pipeline_api_logic';

type PipelinesActions = Pick<
  Actions<PostDefaultPipelineArgs, PostDefaultPipelineResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  fetchDefaultPipeline: Actions<undefined, FetchDefaultPipelineResponse>['makeRequest'];
  fetchDefaultPipelineError: Actions<undefined, FetchDefaultPipelineResponse>['apiError'];
  fetchDefaultPipelineSuccess: Actions<undefined, FetchDefaultPipelineResponse>['apiSuccess'];
  setPipeline(pipeline: IngestPipelineParams): {
    pipeline: IngestPipelineParams;
  };
};

interface PipelinesValues {
  defaultPipeline: IngestPipelineParams;
  fetchStatus: Status;
  hasNoChanges: boolean;
  isLoading: boolean;
  pipelineState: IngestPipelineParams;
  status: Status;
}

export const SettingsLogic = kea<MakeLogicType<PipelinesValues, PipelinesActions>>({
  actions: {
    setPipeline: (pipeline: IngestPipelineParams) => ({ pipeline }),
  },
  connect: {
    actions: [
      UpdateDefaultPipelineApiLogic,
      ['apiSuccess', 'apiError', 'makeRequest'],
      FetchDefaultPipelineApiLogic,
      [
        'apiError as fetchDefaultPipelineError',
        'apiSuccess as fetchDefaultPipelineSuccess',
        'makeRequest as fetchDefaultPipeline',
      ],
    ],
    values: [
      FetchDefaultPipelineApiLogic,
      ['data as defaultPipeline', 'status as fetchStatus'],
      UpdateDefaultPipelineApiLogic,
      ['status'],
    ],
  },
  events: ({ actions }) => ({
    afterMount: () => {
      if (KibanaLogic.values.productFeatures.hasDefaultIngestPipeline === false) return;
      actions.fetchDefaultPipeline(undefined);
    },
  }),
  listeners: ({ actions }) => ({
    apiSuccess: (pipeline) => {
      actions.fetchDefaultPipelineSuccess(pipeline);
    },
    fetchDefaultPipelineSuccess: (pipeline) => {
      actions.setPipeline(pipeline);
    },
  }),
  path: ['enterprise_search', 'content', 'settings'],
  reducers: () => ({
    pipelineState: [
      DEFAULT_PIPELINE_VALUES,
      {
        setPipeline: (_, { pipeline }) => pipeline,
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
    hasNoChanges: [
      () => [selectors.pipelineState, selectors.defaultPipeline],
      (pipelineState: IngestPipelineParams, defaultPipeline: IngestPipelineParams) =>
        deepEqual(pipelineState, defaultPipeline),
    ],
    isLoading: [
      () => [selectors.status, selectors.fetchStatus],
      (status, fetchStatus) =>
        [Status.LOADING, Status.IDLE].includes(fetchStatus) || status === Status.LOADING,
    ],
  }),
});

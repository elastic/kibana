/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { isDeepEqual } from 'react-use/lib/util';

import { i18n } from '@kbn/i18n';

import { DEFAULT_PIPELINE_VALUES } from '../../../../../common/constants';
import { Status } from '../../../../../common/types/api';

import { IngestPipelineParams } from '../../../../../common/types/connectors';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../shared/flash_messages';

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
      actions.fetchDefaultPipeline(undefined);
    },
  }),
  listeners: ({ actions }) => ({
    apiError: (error) => flashAPIErrors(error),
    apiSuccess: (pipeline) => {
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.content.indices.defaultPipelines.successToast.title',
          {
            defaultMessage: 'Default pipeline successfully updated',
          }
        )
      );
      actions.fetchDefaultPipelineSuccess(pipeline);
    },
    fetchDefaultPipelineSuccess: (pipeline) => {
      actions.setPipeline(pipeline);
    },
    makeRequest: () => clearFlashMessages(),
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
        isDeepEqual(pipelineState, defaultPipeline),
    ],
    isLoading: [
      () => [selectors.status, selectors.fetchStatus],
      (status, fetchStatus) =>
        [Status.LOADING, Status.IDLE].includes(fetchStatus) || status === Status.LOADING,
    ],
  }),
});

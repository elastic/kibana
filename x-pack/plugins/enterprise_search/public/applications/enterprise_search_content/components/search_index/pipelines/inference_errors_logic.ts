/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../common/types/api';
import { MlInferenceError } from '../../../../../../common/types/pipelines';
import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { clearFlashMessages, flashAPIErrors } from '../../../../shared/flash_messages';
import {
  FetchMlInferenceErrorsApiLogicArgs,
  FetchMlInferenceErrorsApiLogicResponse,
  FetchMlInferenceErrorsApiLogic,
} from '../../../api/pipelines/fetch_ml_inference_pipeline_errors';
import { IndexNameLogic } from '../index_name_logic';

interface InferenceErrorsActions {
  fetchIndexInferenceErrorLogs: Actions<
    FetchMlInferenceErrorsApiLogicArgs,
    FetchMlInferenceErrorsApiLogicResponse
  >['makeRequest'];
  fetchIndexInferenceErrorLogsError: Actions<
    FetchMlInferenceErrorsApiLogicArgs,
    FetchMlInferenceErrorsApiLogicResponse
  >['apiError'];
}

interface InferenceErrorsValues {
  fetchIndexInferenceHistoryStatus: Status;
  indexName: string;
  inferenceErrors: MlInferenceError[];
  inferenceErrorsData: FetchMlInferenceErrorsApiLogicResponse | undefined;
  isLoading: boolean;
}

export const InferenceErrorsLogic = kea<
  MakeLogicType<InferenceErrorsValues, InferenceErrorsActions>
>({
  connect: {
    actions: [
      FetchMlInferenceErrorsApiLogic,
      [
        'makeRequest as fetchIndexInferenceErrorLogs',
        'apiError as fetchIndexInferenceErrorLogsError',
      ],
    ],
    values: [
      IndexNameLogic,
      ['indexName'],
      FetchMlInferenceErrorsApiLogic,
      ['data as inferenceErrorsData', 'status as fetchIndexInferenceHistoryStatus'],
    ],
  },
  listeners: () => ({
    fetchIndexInferenceErrorLogs: () => clearFlashMessages(),
    fetchIndexInferenceErrorLogsError: (error) => flashAPIErrors(error),
  }),
  path: ['enterprise_search', 'content', 'pipelines_inference_errors'],
  selectors: ({ selectors }) => ({
    inferenceErrors: [
      () => [selectors.inferenceErrorsData],
      (inferenceErrorsData: FetchMlInferenceErrorsApiLogicResponse | undefined) =>
        inferenceErrorsData?.errors ?? [],
    ],
    isLoading: [
      () => [selectors.fetchIndexInferenceHistoryStatus],
      (fetchIndexInferenceHistoryStatus: Status) =>
        fetchIndexInferenceHistoryStatus !== Status.SUCCESS &&
        fetchIndexInferenceHistoryStatus !== Status.ERROR,
    ],
  }),
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../common/types/api';
import { MlInferenceHistoryItem } from '../../../../../../common/types/pipelines';
import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  FetchMlInferencePipelineHistoryApiLogicArgs,
  FetchMlInferencePipelineHistoryApiLogicResponse,
  FetchMlInferencePipelineHistoryApiLogic,
} from '../../../api/pipelines/fetch_ml_inference_pipeline_history';
import { IndexNameLogic } from '../index_name_logic';

export interface InferenceHistoryActions {
  fetchIndexInferenceHistory: Actions<
    FetchMlInferencePipelineHistoryApiLogicArgs,
    FetchMlInferencePipelineHistoryApiLogicResponse
  >['makeRequest'];
}

export interface InferenceHistoryValues {
  fetchIndexInferenceHistoryStatus: Status;
  indexName: string;
  inferenceHistory: MlInferenceHistoryItem[] | undefined;
  inferenceHistoryData: FetchMlInferencePipelineHistoryApiLogicResponse | undefined;
  isLoading: boolean;
}

export const InferenceHistoryLogic = kea<
  MakeLogicType<InferenceHistoryValues, InferenceHistoryActions>
>({
  connect: {
    actions: [
      FetchMlInferencePipelineHistoryApiLogic,
      ['makeRequest as fetchIndexInferenceHistory', 'apiError as fetchIndexInferenceHistoryError'],
    ],
    values: [
      IndexNameLogic,
      ['indexName'],
      FetchMlInferencePipelineHistoryApiLogic,
      ['data as inferenceHistoryData', 'status as fetchIndexInferenceHistoryStatus'],
    ],
  },
  path: ['enterprise_search', 'content', 'pipelines_inference_history'],
  selectors: ({ selectors }) => ({
    inferenceHistory: [
      () => [selectors.inferenceHistoryData],
      (inferenceHistoryData: FetchMlInferencePipelineHistoryApiLogicResponse | undefined) =>
        inferenceHistoryData?.history,
    ],
    isLoading: [
      () => [selectors.fetchIndexInferenceHistoryStatus],
      (fetchIndexInferenceHistoryStatus: Status) =>
        fetchIndexInferenceHistoryStatus !== Status.SUCCESS &&
        fetchIndexInferenceHistoryStatus !== Status.ERROR,
    ],
  }),
});

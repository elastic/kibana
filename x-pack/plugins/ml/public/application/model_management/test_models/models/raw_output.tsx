/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC } from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { MLJobEditor } from '../../../jobs/jobs_list/components/ml_job_editor';

import type { InferrerType } from '.';
import { NerResponse } from './ner';
import { TextClassificationResponse } from './text_classification';
import { TextEmbeddingResponse } from './text_embedding';
import { INPUT_TYPE, RUNNING_STATE } from './inference_base';
import { RawTextClassificationResponse } from './text_classification/common';
import { RawTextEmbeddingResponse } from './text_embedding/text_embedding_inference';

type InferenceResponse = NerResponse[] | TextClassificationResponse[] | TextEmbeddingResponse[];
type ResultResponses = Array<
  estypes.MlInferTrainedModelResponse | RawTextClassificationResponse | RawTextEmbeddingResponse
>;

export const RawOutput: FC<{
  inferrer: InferrerType;
}> = ({ inferrer }) => {
  const inferenceError = useObservable(inferrer.getInferenceError$(), inferrer.getInferenceError());
  const runningState = useObservable(inferrer.getRunningState$(), inferrer.getRunningState());
  const inferenceResult = useObservable(
    inferrer.getInferenceResult$() as Observable<InferenceResponse>,
    inferrer.getInferenceResult() as InferenceResponse
  );

  if (
    (runningState === RUNNING_STATE.FINISHED_WITH_ERRORS && !inferenceError) ||
    (runningState === RUNNING_STATE.FINISHED && !inferenceResult)
  ) {
    return null;
  }

  const resultResponse: ResultResponses = [];
  if (inferenceResult) {
    for (const { rawResponse } of inferenceResult) {
      resultResponse.push(rawResponse);
    }
  }

  const rawResponse =
    runningState === RUNNING_STATE.FINISHED_WITH_ERRORS
      ? JSON.stringify(inferenceError?.body ?? inferenceError, null, 2)
      : JSON.stringify(
          inferrer.getInputType() === INPUT_TYPE.TEXT ? resultResponse[0] : resultResponse,
          null,
          2
        );

  return (
    <>
      <MLJobEditor data-test-subj={'mlTestModelRawOutput'} value={rawResponse ?? ''} readOnly />
    </>
  );
};

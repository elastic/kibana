/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { MLJobEditor } from '../../../../jobs/jobs_list/components/ml_job_editor';

import type { InferrerType } from '.';
import { NerResponse } from './ner';
import { TextClassificationResponse } from './text_classification';
import { TextEmbeddingResponse } from './text_embedding';
import { RUNNING_STATE } from './inference_base';

type InferenceResponse = NerResponse | TextClassificationResponse | TextEmbeddingResponse;

export const RawOutput: FC<{
  inferrer: InferrerType;
}> = ({ inferrer }) => {
  const inferenceError = useObservable(inferrer.inferenceError$);
  const runningState = useObservable(inferrer.runningState$);
  const inferenceResult = useObservable(inferrer.inferenceResult$ as Observable<InferenceResponse>);

  if (
    (runningState === RUNNING_STATE.FINISHED_WITH_ERRORS && !inferenceError) ||
    (runningState === RUNNING_STATE.FINISHED && !inferenceResult)
  ) {
    return null;
  }

  const rawResponse =
    runningState === RUNNING_STATE.FINISHED_WITH_ERRORS
      ? JSON.stringify(inferenceError?.body ?? inferenceError, null, 2)
      : JSON.stringify(inferenceResult?.rawResponse, null, 2);

  return (
    <>
      <MLJobEditor value={rawResponse ?? ''} readOnly={true} />
    </>
  );
};

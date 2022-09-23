/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { TextInput } from '../text_input';
import { QuestionAnsweringInference } from './question_answering_inference';
import { RUNNING_STATE } from '../inference_base';

const QuestionInput: FC<{
  inferrer: QuestionAnsweringInference;
}> = ({ inferrer }) => {
  const [questionText, setQuestionText] = useState('');

  useEffect(() => {
    inferrer.questionText$.next(questionText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionText]);

  const runningState = useObservable(inferrer.runningState$);
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.questionAnswering.questionInput',
        {
          defaultMessage: 'Question',
        }
      )}
    >
      <EuiFieldText
        value={questionText}
        disabled={runningState === RUNNING_STATE.RUNNING}
        fullWidth
        onChange={(e) => {
          setQuestionText(e.target.value);
        }}
      />
    </EuiFormRow>
  );
};

export const getQuestionAnsweringInput = (
  inferrer: QuestionAnsweringInference,
  placeholder?: string
) => (
  <>
    <TextInput placeholder={placeholder} inferrer={inferrer} />
    <EuiSpacer />
    <QuestionInput inferrer={inferrer} />
  </>
);

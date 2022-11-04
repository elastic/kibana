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
import { ZeroShotClassificationInference } from './zero_shot_classification_inference';
import { INPUT_TYPE, RUNNING_STATE } from '../inference_base';

const ClassNameInput: FC<{
  inferrer: ZeroShotClassificationInference;
}> = ({ inferrer }) => {
  const [labelsText, setLabelsText] = useState('');

  useEffect(() => {
    inferrer.labelsText$.next(labelsText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsText]);

  const runningState = useObservable(inferrer.runningState$);
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.textClassification.classNamesInput',
        {
          defaultMessage: 'Class labels',
        }
      )}
      helpText="Separate the labels with commas"
    >
      <EuiFieldText
        value={labelsText}
        disabled={runningState === RUNNING_STATE.RUNNING}
        fullWidth
        onChange={(e) => {
          setLabelsText(e.target.value);
        }}
      />
    </EuiFormRow>
  );
};

export const getZeroShotClassificationInput = (
  inferrer: ZeroShotClassificationInference,
  placeholder?: string
) => (
  <>
    {inferrer.getInputType() === INPUT_TYPE.TEXT ? (
      <>
        <TextInput placeholder={placeholder} inferrer={inferrer} />
        <EuiSpacer />
      </>
    ) : null}
    <ClassNameInput inferrer={inferrer} />
  </>
);

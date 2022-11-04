/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiProgress,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';

// import { ArrayElement } from '../../../../../../../common/types/common';
import type {
  TextClassificationInference,
  ZeroShotClassificationInference,
  FillMaskInference,
  LangIdentInference,
  FormattedTextClassificationResponse,
} from '.';
// import { INPUT_TYPE } from '../inference_base';

export const getTextClassificationOutputComponent = (
  inferrer:
    | TextClassificationInference
    | ZeroShotClassificationInference
    | FillMaskInference
    | LangIdentInference
) => <TextClassificationOutput inferrer={inferrer} />;

export const TextClassificationOutput: FC<{
  inferrer:
    | TextClassificationInference
    | ZeroShotClassificationInference
    | FillMaskInference
    | LangIdentInference;
}> = ({ inferrer }) => {
  const result = useObservable(inferrer.inferenceResult$);
  if (!result) {
    return null;
  }

  return (
    <>
      {result.map(({ response, inputText }) => (
        <>
          <PredictionProbabilityList response={response} inputText={inputText} />
          <EuiHorizontalRule />
        </>
      ))}
    </>
  );
};

export const PredictionProbabilityList: FC<{
  response: FormattedTextClassificationResponse;
  inputText?: string;
}> = ({ response, inputText }) => {
  return (
    <>
      {inputText !== undefined ? (
        <>
          <EuiTitle size="xxs">
            <span>{inputText}</span>
          </EuiTitle>
          <EuiSpacer />
        </>
      ) : null}

      {response.map(({ value, predictionProbability }) => (
        <>
          <EuiProgress value={predictionProbability * 100} max={100} size="m" />
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <>
              <EuiFlexItem>{value}</EuiFlexItem>
              <EuiFlexItem grow={false}>{predictionProbability}</EuiFlexItem>
            </>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      ))}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTextArea,
  EuiCopy,
  EuiButton,
  EuiHorizontalRule,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import type { TextEmbeddingInference } from './text_embedding_inference';

export const getTextEmbeddingOutputComponent = (inferrer: TextEmbeddingInference) => (
  <TextEmbeddingOutput inferrer={inferrer} />
);

const TextEmbeddingOutput: FC<{
  inferrer: TextEmbeddingInference;
}> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());
  if (!result) {
    return null;
  }

  return (
    <>
      {result.map(({ response, inputText }) => (
        <>
          <TextEmbedding value={response.predictedValue.toString()} inputText={inputText} />
          <EuiHorizontalRule />
        </>
      ))}
    </>
  );
};

const TextEmbedding: FC<{
  value: string;
  inputText: string;
}> = ({ value, inputText }) => {
  return (
    <>
      <EuiText size="s">{inputText}</EuiText>
      <EuiSpacer size="s" />
      <EuiTextArea value={value} fullWidth style={{ height: 300 }} />
      <EuiCopy textToCopy={value}>
        {(copy) => (
          <EuiButton size="s" onClick={copy}>
            <FormattedMessage
              id="xpack.ml.trainedModels.testModelsFlyout.textEmbedding.copyButton"
              defaultMessage="Copy to clipboard"
            />
          </EuiButton>
        )}
      </EuiCopy>
    </>
  );
};

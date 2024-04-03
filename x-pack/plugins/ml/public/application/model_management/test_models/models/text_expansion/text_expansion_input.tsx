/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { TextInput } from '../text_input';
import type { TextExpansionInference } from './text_expansion_inference';
import { INPUT_TYPE, RUNNING_STATE } from '../inference_base';

const QueryInput: FC<{
  inferrer: TextExpansionInference;
}> = ({ inferrer }) => {
  const questionText = useObservable(inferrer.getQueryText$(), inferrer.getQueryText());
  const runningState = useObservable(inferrer.getRunningState$(), inferrer.getRunningState());

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textExpansion.queryInput', {
        defaultMessage: 'Search query',
      })}
    >
      <EuiFieldText
        value={questionText}
        disabled={runningState === RUNNING_STATE.RUNNING}
        fullWidth
        onChange={(e) => {
          inferrer.setQueryText(e.target.value);
        }}
      />
    </EuiFormRow>
  );
};

export const getTextExpansionInput = (inferrer: TextExpansionInference, placeholder?: string) => (
  <>
    {inferrer.getInputType() === INPUT_TYPE.TEXT ? (
      <>
        <TextInput placeholder={placeholder} inferrer={inferrer} />
        <EuiSpacer />
      </>
    ) : null}

    <QueryInput inferrer={inferrer} />
  </>
);

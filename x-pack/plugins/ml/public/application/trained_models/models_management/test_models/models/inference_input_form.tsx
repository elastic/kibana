/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useMemo } from 'react';

import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiButton, EuiTabs, EuiTab } from '@elastic/eui';

import type { FormattedLangIdentResponse } from './lang_ident';
import type { FormattedNerResponse } from './ner';
import type { FormattedTextClassificationResponse } from './text_classification';
import type { FormattedTextEmbeddingResponse } from './text_embedding';

import { MLJobEditor } from '../../../../jobs/jobs_list/components/ml_job_editor';
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { ErrorMessage } from '../inference_error';
import { OutputLoadingContent } from '../output_loading';
import { NerInference } from './ner';
import {
  TextClassificationInference,
  ZeroShotClassificationInference,
  FillMaskInference,
} from './text_classification';
import { TextEmbeddingInference } from './text_embedding';
import { LangIdentInference } from './lang_ident';

type FormattedInferenceResponse =
  | FormattedLangIdentResponse
  | FormattedNerResponse
  | FormattedTextClassificationResponse
  | FormattedTextEmbeddingResponse;

interface Props {
  getOutputComponent(inputText: string): JSX.Element;
  getInputComponent: () => { inputComponent: JSX.Element; infer: () => any };
  inferrer:
    | NerInference
    | TextClassificationInference
    | TextEmbeddingInference
    | ZeroShotClassificationInference
    | FillMaskInference
    | LangIdentInference;
}

enum TAB {
  TEXT,
  RAW,
}

export const InferenceInputForm: FC<Props> = ({
  getOutputComponent,
  getInputComponent,
  inferrer,
}) => {
  const [output, setOutput] = useState<FormattedInferenceResponse | null>(null);
  const [inputText, setInputText] = useState('');
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(TAB.TEXT);
  const [showOutput, setShowOutput] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isRunning = useObservable(inferrer.isRunning$);
  const { inputComponent, infer } = useMemo(getInputComponent, []);

  async function run() {
    setShowOutput(true);
    setOutput(null);
    setRawOutput(null);
    setErrorText(null);
    try {
      const { response, rawResponse, inputText: inputText2 } = await infer();
      setOutput(response);
      setInputText(inputText2);
      setRawOutput(JSON.stringify(rawResponse, null, 2));
    } catch (e) {
      setOutput(null);
      setErrorText(extractErrorMessage(e));
      setRawOutput(JSON.stringify(e.body ?? e, null, 2));
    }
  }

  return (
    <>
      <>{inputComponent}</>
      <EuiSpacer size="m" />
      <div>
        <EuiButton onClick={run} disabled={isRunning === true} fullWidth={false}>
          <FormattedMessage
            id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.runButton"
            defaultMessage="Test"
          />
        </EuiButton>
      </div>
      {showOutput === true ? (
        <>
          <EuiSpacer size="m" />
          <EuiTabs size={'s'}>
            <EuiTab
              isSelected={selectedTab === TAB.TEXT}
              onClick={setSelectedTab.bind(null, TAB.TEXT)}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.markupTab"
                defaultMessage="Output"
              />
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === TAB.RAW}
              onClick={setSelectedTab.bind(null, TAB.RAW)}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.rawOutput"
                defaultMessage="Raw output"
              />
            </EuiTab>
          </EuiTabs>

          <EuiSpacer size="m" />

          {selectedTab === TAB.TEXT ? (
            <>
              {errorText !== null ? (
                <ErrorMessage errorText={errorText} />
              ) : output === null ? (
                <OutputLoadingContent text={''} />
              ) : (
                <>{getOutputComponent(inputText)}</>
              )}
            </>
          ) : (
            <MLJobEditor value={rawOutput ?? ''} readOnly={true} />
          )}
        </>
      ) : null}
    </>
  );
};

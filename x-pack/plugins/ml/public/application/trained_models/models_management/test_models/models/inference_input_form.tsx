/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTextArea, EuiButton, EuiTabs, EuiTab } from '@elastic/eui';

import { LangIdentInference } from './lang_ident/lang_ident_inference';
import { NerInference } from './ner/ner_inference';
import type { FormattedLangIdentResp } from './lang_ident/lang_ident_inference';
import type { FormattedNerResp } from './ner/ner_inference';

import { MLJobEditor } from '../../../../jobs/jobs_list/components/ml_job_editor';
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { ErrorMessage } from '../inference_error';
import { OutputLoadingContent } from '../output_loading';

interface Props {
  inferrer: LangIdentInference | NerInference;
  getOutputComponent(output: any): JSX.Element;
}

enum TAB {
  TEXT,
  RAW,
}

export const InferenceInputForm: FC<Props> = ({ inferrer, getOutputComponent }) => {
  const [inputText, setInputText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<FormattedLangIdentResp | FormattedNerResp | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(TAB.TEXT);
  const [showOutput, setShowOutput] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function run() {
    setShowOutput(true);
    setOutput(null);
    setRawOutput(null);
    setIsRunning(true);
    setErrorText(null);
    try {
      const { response, rawResponse } = await inferrer.infer(inputText);
      setOutput(response);
      setRawOutput(JSON.stringify(rawResponse, null, 2));
    } catch (e) {
      setIsRunning(false);
      setOutput(null);
      setErrorText(extractErrorMessage(e));
      setRawOutput(JSON.stringify(e.body ?? e, null, 2));
    }
    setIsRunning(false);
  }

  return (
    <>
      <EuiTextArea
        placeholder={i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.inputText', {
          defaultMessage: 'Input text',
        })}
        value={inputText}
        disabled={isRunning === true}
        fullWidth
        onChange={(e) => {
          setInputText(e.target.value);
        }}
      />
      <EuiSpacer size="m" />
      <div>
        <EuiButton
          onClick={run}
          disabled={isRunning === true || inputText === ''}
          fullWidth={false}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.testModelsFlyout.langIdent.runButton"
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
                id="xpack.ml.trainedModels.testModelsFlyout.langIdent.markupTab"
                defaultMessage="Output"
              />
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === TAB.RAW}
              onClick={setSelectedTab.bind(null, TAB.RAW)}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.langIdent.rawOutput"
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
                <OutputLoadingContent text={inputText} />
              ) : (
                <>{getOutputComponent(output)}</>
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

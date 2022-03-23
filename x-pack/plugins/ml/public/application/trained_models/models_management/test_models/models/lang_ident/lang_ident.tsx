/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useState, useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiSpacer, EuiTextArea, EuiButton, EuiTabs, EuiTab } from '@elastic/eui';

import { useMlApiContext } from '../../../../../contexts/kibana';
import { LangIdentInference } from './lang_ident_inference';
import type { FormattedLangIdentResp } from './lang_ident_inference';
import { LangIdentOutput } from './lang_ident_output';
import { MLJobEditor } from '../../../../../jobs/jobs_list/components/ml_job_editor';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { ErrorMessage } from '../../inference_error';
import { OutputLoadingContent } from '../../output_loading';

interface Props {
  model: estypes.MlTrainedModelConfig;
}

enum TAB {
  TEXT,
  RAW,
}

export const LangIdentModel: FC<Props> = ({ model }) => {
  const { trainedModels } = useMlApiContext();

  const ner = useMemo(() => new LangIdentInference(trainedModels, model), [trainedModels, model]);

  // const [inputText, setInputText] = useState('');
  const [inputText, setInputText] =
    useState(`Hola, mi nombre es James y vivo en Hersham, Surrey con mi esposa Kate y mis hijos Jonathan y Emily.

  Solía ​​vivir en Londres, pero nos mudamos a los palos hace unos 3 años.`);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<FormattedLangIdentResp | null>(null);
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
      const { response, rawResponse } = await ner.infer(inputText);
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
        placeholder="Input text"
        value={inputText}
        disabled={isRunning === true}
        fullWidth={true}
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
            id="xpack.ml.trainedModels.testModelsFlyout.lang_ident.runButton"
            defaultMessage="Run inference"
          />
        </EuiButton>
      </div>
      {showOutput === true ? (
        <>
          <EuiSpacer size="m" />
          <EuiTabs size={'s'}>
            <EuiTab isSelected={selectedTab === TAB.TEXT} onClick={() => setSelectedTab(TAB.TEXT)}>
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.lang_ident.markupTab"
                defaultMessage="Output"
              />
            </EuiTab>
            <EuiTab isSelected={selectedTab === TAB.RAW} onClick={() => setSelectedTab(TAB.RAW)}>
              <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.lang_ident.rawOutput"
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
                <LangIdentOutput result={output} />
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

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
import { DgaInference } from './dga_inference';
import type { FormattedDgaResp } from './dga_inference';
import { DGAOutput } from './dga_output';
import { MLJobEditor } from '../../../../../jobs/jobs_list/components/ml_job_editor';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { ErrorMessage } from '../../error';
import { OutputLoadingContent } from '../../output_loading';

interface Props {
  model: estypes.MlTrainedModelConfig;
}

enum TAB {
  TEXT,
  RAW,
}

// const EXAMPLE_TEXT = ``;
const EXAMPLE_TEXT = `212-83-144-11.rev.poneytelecom.eu\n1212-83-144-11.rev.poneytelecom.eu\n212-83-144-113.rev.poneytelecom.eu`;

export const DgaModel: FC<Props> = ({ model }) => {
  const { trainedModels } = useMlApiContext();

  const ner = useMemo(() => new DgaInference(trainedModels, model), [trainedModels, model]);

  const [inputText, setInputText] = useState(EXAMPLE_TEXT);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<FormattedDgaResp | null>(null);
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
            id="xpack.ml.trainedModels.testSavedObjectsFlyout.ner.runButton"
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
                id="xpack.ml.trainedModels.testSavedObjectsFlyout.ner.markupTab"
                defaultMessage="Output"
              />
            </EuiTab>
            <EuiTab isSelected={selectedTab === TAB.RAW} onClick={() => setSelectedTab(TAB.RAW)}>
              <FormattedMessage
                id="xpack.ml.trainedModels.testSavedObjectsFlyout.ner.rawOutput"
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
                <DGAOutput result={output} />
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

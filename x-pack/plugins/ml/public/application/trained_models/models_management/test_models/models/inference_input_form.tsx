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
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { ErrorMessage } from '../inference_error';
import { OutputLoadingContent } from '../output_loading';
import { RUNNING_STATE } from './inference_base';
import { RawOutput } from './raw_output';
import type { InferrerType } from '.';

interface Props {
  inferrer: InferrerType;
}

enum TAB {
  TEXT,
  RAW,
}

export const InferenceInputForm: FC<Props> = ({ inferrer }) => {
  const [selectedTab, setSelectedTab] = useState(TAB.TEXT);
  const [errorText, setErrorText] = useState<string | null>(null);

  const runningState = useObservable(inferrer.runningState$);
  const inputText = useObservable(inferrer.inputText$) ?? [];
  const inputComponent = useMemo(() => inferrer.getInputComponent(), [inferrer]);
  const outputComponent = useMemo(() => inferrer.getOutputComponent(), [inferrer]);
  const infoComponent = useMemo(() => inferrer.getInfoComponent(), [inferrer]);

  async function run() {
    setErrorText(null);
    try {
      await inferrer.infer();
    } catch (e) {
      setErrorText(extractErrorMessage(e));
    }
  }

  return (
    <>
      <>{infoComponent}</>
      <>{inputComponent}</>
      <EuiSpacer size="m" />
      <div>
        <EuiButton
          onClick={run}
          disabled={runningState === RUNNING_STATE.RUNNING || inputText[0] === ''}
          fullWidth={false}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.runButton"
            defaultMessage="Test"
          />
        </EuiButton>
      </div>
      {runningState !== RUNNING_STATE.STOPPED ? (
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
              {runningState === RUNNING_STATE.RUNNING ? <OutputLoadingContent text={''} /> : null}

              {errorText !== null || runningState === RUNNING_STATE.FINISHED_WITH_ERRORS ? (
                <ErrorMessage errorText={errorText} />
              ) : null}

              {runningState === RUNNING_STATE.FINISHED ? <>{outputComponent}</> : null}
            </>
          ) : (
            <RawOutput inferrer={inferrer} />
          )}
        </>
      ) : null}
    </>
  );
};

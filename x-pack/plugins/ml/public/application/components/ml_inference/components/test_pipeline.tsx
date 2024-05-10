/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiResizableContainer,
  EuiSpacer,
  EuiTitle,
  EuiText,
  useIsWithinMaxBreakpoint,
  EuiPanel,
  htmlIdGenerator,
} from '@elastic/eui';

import type { IngestSimulateDocument } from '@elastic/elasticsearch/lib/api/types';
import { extractErrorProperties } from '@kbn/ml-error-utils';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/code-editor';
import { useMlApiContext, useMlKibana } from '../../../contexts/kibana';
import { getPipelineConfig } from '../get_pipeline_config';
import { isValidJson } from '../../../../../common/util/validation_utils';
import type { MlInferenceState } from '../types';
import { checkIndexExists } from '../retry_create_data_view';
import { type TestPipelineMode, TEST_PIPELINE_MODE } from '../types';

const sourceIndexMissingMessage = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.sourceIndexMissing',
  {
    defaultMessage:
      'The source index used to train the model is missing. Enter text for documents to test the pipeline.',
  }
);

interface Props {
  sourceIndex?: string;
  state: MlInferenceState;
  mode: TestPipelineMode;
}

export const TestPipeline: FC<Props> = memo(({ state, sourceIndex, mode }) => {
  const [simulatePipelineResult, setSimulatePipelineResult] = useState<
    undefined | estypes.IngestSimulateResponse
  >();
  const [simulatePipelineError, setSimulatePipelineError] = useState<undefined | string>();
  const [sourceIndexMissingError, setSourceIndexMissingError] = useState<undefined | string>();
  const [sampleDocsString, setSampleDocsString] = useState<string>('');
  const [lastFetchedSampleDocsString, setLastFetchedSampleDocsString] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [showCallOut, setShowCallOut] = useState<boolean>(true);
  const {
    esSearch,
    trainedModels: { trainedModelPipelineSimulate },
  } = useMlApiContext();
  const {
    notifications: { toasts },
    services: {
      docLinks: { links },
    },
  } = useMlKibana();

  const isSmallerViewport = useIsWithinMaxBreakpoint('s');
  const accordionId = useMemo(() => htmlIdGenerator()(), []);
  const pipelineConfig = useMemo(() => getPipelineConfig(state), [state]);
  const requestBody = useMemo(() => {
    const body = { pipeline: pipelineConfig, docs: [] };
    if (isValidJson(sampleDocsString)) {
      body.docs = JSON.parse(sampleDocsString);
    }
    return body;
  }, [pipelineConfig, sampleDocsString]);

  const simulatePipeline = async () => {
    try {
      const result = await trainedModelPipelineSimulate(
        pipelineConfig,
        JSON.parse(sampleDocsString) as IngestSimulateDocument[]
      );
      setSimulatePipelineResult(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      const errorProperties = extractErrorProperties(error);
      setSimulatePipelineError(error);
      toasts.danger({
        title: i18n.translate(
          'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.errorSimulatingPipeline',
          {
            defaultMessage: 'Unable to simulate pipeline.',
          }
        ),
        body: errorProperties.message,
        toastLifeTimeMs: 5000,
      });
    }
  };

  const clearResults = () => {
    setSimulatePipelineResult(undefined);
    setSimulatePipelineError(undefined);
  };

  const onChange = (json: string) => {
    setSampleDocsString(json);
    const valid = isValidJson(json);
    setIsValid(valid);
  };

  const getDocs = useCallback(
    async (body: any) => {
      let records: IngestSimulateDocument[] = [];
      let resp;
      try {
        resp = await esSearch(body);

        if (resp && resp.hits.total.value > 0) {
          records = resp.hits.hits;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
      setSampleDocsString(JSON.stringify(records, null, 2));
      setSimulatePipelineResult(undefined);
      setLastFetchedSampleDocsString(JSON.stringify(records, null, 2));
      setIsValid(true);
    },
    [esSearch]
  );

  const { getSampleDoc, getRandomSampleDoc } = useMemo(
    () => ({
      getSampleDoc: async () => {
        getDocs({
          index: sourceIndex,
          body: {
            size: 1,
          },
        });
      },
      getRandomSampleDoc: async () => {
        getDocs({
          index: sourceIndex,
          body: {
            size: 1,
            query: {
              function_score: {
                query: { match_all: {} },
                random_score: {},
              },
            },
          },
        });
      },
    }),
    [getDocs, sourceIndex]
  );

  useEffect(
    function checkSourceIndexExists() {
      async function ensureSourceIndexExists() {
        const resp = await checkIndexExists(sourceIndex!);
        const indexExists = resp.resp && resp.resp[sourceIndex!] && resp.resp[sourceIndex!].exists;
        if (indexExists === false) {
          setSourceIndexMissingError(sourceIndexMissingMessage);
        }
      }
      if (sourceIndex) {
        ensureSourceIndexExists();
      }
    },
    [sourceIndex, sourceIndexMissingError]
  );

  useEffect(
    function fetchSampleDocsFromSource() {
      if (sourceIndex && sourceIndexMissingError === undefined) {
        getSampleDoc();
      }
    },
    [sourceIndex, getSampleDoc, sourceIndexMissingError]
  );

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        data-test-subj="mlTrainedModelsInferenceTestStep"
      >
        <EuiFlexItem>
          <EuiTitle size="s">
            <h4>
              {i18n.translate(
                'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.title',
                { defaultMessage: 'Test the pipeline results' }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            <p>
              {mode === TEST_PIPELINE_MODE.STEP ? (
                <>
                  <strong>
                    {i18n.translate(
                      'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.optionalCallout',
                      { defaultMessage: 'This is an optional step.' }
                    )}
                  </strong>
                  &nbsp;
                </>
              ) : null}
              <>
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.description"
                  defaultMessage="Run a simulation of the pipeline to confirm it produces the anticipated results. {simulatePipelineDocsLink}"
                  values={{
                    simulatePipelineDocsLink: (
                      <EuiLink external target="_blank" href={links.apis.simulatePipeline}>
                        Learn more.
                      </EuiLink>
                    ),
                  }}
                />
                <br />
              </>
              {state.targetField && (
                <>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.targetFieldHint"
                    defaultMessage="Check for the target field {targetField} for the prediction in the Result tab."
                    values={{
                      targetField: <EuiCode>{state.targetField}</EuiCode>,
                    }}
                  />
                  <br />
                </>
              )}
              {sampleDocsString && sourceIndexMissingError === undefined ? (
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.sourceIndexDocText"
                  defaultMessage="The provided sample document is taken from the source index used to train the model."
                />
              ) : null}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="m" />
        {sourceIndexMissingError && showCallOut ? (
          <EuiFlexItem>
            <EuiCallOut
              onDismiss={() => {
                setShowCallOut(false);
              }}
              size="s"
              title={sourceIndexMissingError}
              iconType="warning"
            />
            <EuiSpacer size="s" />
          </EuiFlexItem>
        ) : null}
        {mode === TEST_PIPELINE_MODE.STAND_ALONE ? (
          <EuiFlexItem>
            <EuiAccordion
              id={accordionId}
              buttonContent={
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.viewRequest"
                  defaultMessage="View request body"
                />
              }
            >
              <EuiCodeBlock
                language="json"
                isCopyable
                overflowHeight="400px"
                data-test-subj="mlTrainedModelsInferenceTestStepConfigBlock"
              >
                {JSON.stringify(requestBody, null, 2)}
              </EuiCodeBlock>
            </EuiAccordion>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={false} hasShadow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButton
                    onClick={simulatePipeline}
                    disabled={sampleDocsString === '' || !isValid}
                  >
                    {i18n.translate(
                      'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.runButton',
                      { defaultMessage: 'Simulate pipeline' }
                    )}
                  </EuiButton>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={clearResults}
                  disabled={simulatePipelineResult === undefined}
                >
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.clearResultsButton',
                    { defaultMessage: 'Clear results' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => setSampleDocsString(lastFetchedSampleDocsString)}
                  disabled={
                    sampleDocsString === '' || sampleDocsString === lastFetchedSampleDocsString
                  }
                >
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.resetSampleDocsButton',
                    { defaultMessage: 'Reset' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={getRandomSampleDoc}
                  disabled={sampleDocsString === ''}
                >
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.reloadSampleDocsButton',
                    { defaultMessage: 'Reload' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText>
                  <h5>
                    {i18n.translate(
                      'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.subtitle.documents',
                      { defaultMessage: 'Raw document' }
                    )}
                  </h5>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <h5>
                    {i18n.translate(
                      'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.subtitle.result',
                      { defaultMessage: 'Result' }
                    )}
                  </h5>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiResizableContainer
              direction={isSmallerViewport ? 'vertical' : 'horizontal'}
              css={css`
                min-height: calc(${euiThemeVars.euiSizeXL} * 10);
              `}
            >
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  <EuiResizablePanel grow hasBorder initialSize={50} paddingSize="xs">
                    <CodeEditor
                      data-test-subj="mlTrainedModelsInferenceTestDocsEditor"
                      languageId="json"
                      options={{
                        automaticLayout: true,
                        lineNumbers: 'off',
                        tabSize: 2,
                      }}
                      value={sampleDocsString}
                      onChange={onChange}
                    />
                  </EuiResizablePanel>

                  <EuiResizablePanel grow={false} hasBorder initialSize={50} paddingSize="xs">
                    <EuiCodeBlock
                      language="json"
                      isCopyable
                      data-test-subj="mlTrainedModelsInferenceTestResult"
                    >
                      {simulatePipelineError
                        ? JSON.stringify(simulatePipelineError, null, 2)
                        : simulatePipelineResult
                        ? JSON.stringify(simulatePipelineResult, null, 2)
                        : '{}'}
                    </EuiCodeBlock>
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiFlexItem>
          <EuiSpacer />
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useEffect, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiSpacer,
  EuiTitle,
  EuiText,
  useIsWithinMaxBreakpoint,
  EuiPanel,
} from '@elastic/eui';

import { IngestSimulateDocument } from '@elastic/elasticsearch/lib/api/types';
import { extractErrorProperties } from '@kbn/ml-error-utils';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { useMlApiContext, useMlKibana } from '../../../contexts/kibana';
import { getPipelineConfig } from '../get_pipeline_config';
import { isValidJson } from '../../../../../common/util/validation_utils';
import type { MlInferenceState } from '../types';

interface Props {
  sourceIndex?: string;
  state: MlInferenceState;
}

export const TestPipeline: FC<Props> = memo(({ state, sourceIndex }) => {
  const [simulatePipelineResult, setSimulatePipelineResult] = useState<
    undefined | estypes.IngestSimulateResponse
  >();
  const [simulatePipelineError, setSimulatePipelineError] = useState<undefined | string>();
  const [sampleDocsString, setSampleDocsString] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const {
    esSearch,
    trainedModels: { trainedModelPipelineSimulate },
  } = useMlApiContext();
  const {
    notifications: { toasts },
  } = useMlKibana();

  const isSmallerViewport = useIsWithinMaxBreakpoint('s');

  const simulatePipeline = async () => {
    try {
      const pipelineConfig = getPipelineConfig(state);
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

  const getSampleDocs = useCallback(async () => {
    let records: IngestSimulateDocument[] = [];
    let resp;

    try {
      resp = await esSearch({
        index: sourceIndex,
        body: {
          size: 1,
        },
      });

      if (resp && resp.hits.total.value > 0) {
        records = resp.hits.hits;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    setSampleDocsString(JSON.stringify(records, null, 2));
    setIsValid(true);
  }, [sourceIndex, esSearch]);

  useEffect(
    function fetchSampleDocsFromSource() {
      if (sourceIndex) {
        getSampleDocs();
      }
    },
    [sourceIndex, getSampleDocs]
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
              <strong>
                {i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.optionalCallout',
                  { defaultMessage: 'This is an optional step.' }
                )}
              </strong>
              &nbsp;
              <FormattedMessage
                id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.description"
                defaultMessage="Run a simulation of the pipeline to confirm it produces the anticipated results."
              />{' '}
              {state.targetField && (
                <FormattedMessage
                  id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.targetFieldHint"
                  defaultMessage="Check for the target field {targetField} for the prediction in the Result tab."
                  values={{ targetField: <EuiCode>{state.targetField}</EuiCode> }}
                />
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
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
                  onClick={getSampleDocs}
                  disabled={sampleDocsString === ''}
                >
                  {i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.test.resetSampleDocsButton',
                    { defaultMessage: 'Reset sample docs' }
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

                  <EuiResizableButton />

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

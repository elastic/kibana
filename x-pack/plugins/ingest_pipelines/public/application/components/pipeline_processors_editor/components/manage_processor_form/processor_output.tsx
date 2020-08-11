/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiAccordion,
  EuiCodeBlock,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
} from '@elastic/eui';

import { useTestPipelineContext } from '../../context';
import { ProcessorInternal } from '../../types';

export interface Props {
  processor: ProcessorInternal;
}

export const ProcessorOutput: React.FunctionComponent<Props> = ({ processor }) => {
  const { testPipelineData, setCurrentTestPipelineData } = useTestPipelineContext();
  const { id: processorId } = processor;

  const {
    resultsByProcessor,
    config: { documents, selectedDocumentIndex },
  } = testPipelineData;

  const processorOutput =
    resultsByProcessor && resultsByProcessor[selectedDocumentIndex][processorId];

  const {
    prevProcessorResult,
    doc: currentResult,
    ignored_error: ignoredError,
    error,
  } = processorOutput!;

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.processorOutput.descriptionText"
            defaultMessage="View how the processor affects the ingest document as it passes through the pipeline."
          />
        </p>
      </EuiText>

      {currentResult && (
        <>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <p>
                <FormattedMessage
                  id="xpack.ingestPipelines.processorOutput.processorOutputCodeBlockLabel"
                  defaultMessage="Processor output"
                />
              </p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {documents && documents.length > 1 && (
                <EuiPagination
                  pageCount={documents.length}
                  activePage={selectedDocumentIndex}
                  onPageClick={(activePage) => {
                    setCurrentTestPipelineData({
                      type: 'updateActiveDocument',
                      payload: {
                        config: {
                          selectedDocumentIndex: activePage,
                        },
                      },
                    });
                  }}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiCodeBlock paddingSize="s" language="json" isCopyable>
            {JSON.stringify(currentResult, null, 2)}
          </EuiCodeBlock>
        </>
      )}

      {error && (
        <>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <p>
                <FormattedMessage
                  id="xpack.ingestPipelines.processorOutput.processorErrorCodeBlockLabel"
                  defaultMessage="Processor output"
                />
              </p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* TODO fix: duplicate code */}
              {documents && documents.length > 1 && (
                <EuiPagination
                  pageCount={documents.length}
                  activePage={selectedDocumentIndex}
                  onPageClick={(activePage) => {
                    setCurrentTestPipelineData({
                      type: 'updateActiveDocument',
                      payload: {
                        config: {
                          selectedDocumentIndex: activePage,
                        },
                      },
                    });
                  }}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiCodeBlock paddingSize="s" language="json" isCopyable>
            {JSON.stringify(error, null, 2)}
          </EuiCodeBlock>
        </>
      )}

      {prevProcessorResult?.doc && (
        <>
          <EuiSpacer />
          <EuiAccordion
            id="prev_accordion"
            buttonContent={
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.ingestPipelines.processorOutput.previousOutputCodeBlockLabel"
                    defaultMessage="View previous processor output"
                  />
                </p>
              </EuiText>
            }
          >
            <>
              <EuiSpacer />
              <EuiCodeBlock paddingSize="s" language="json" isCopyable>
                {JSON.stringify(prevProcessorResult.doc, null, 2)}
              </EuiCodeBlock>
            </>
          </EuiAccordion>
        </>
      )}

      {ignoredError && (
        <>
          <EuiSpacer />
          <EuiAccordion
            id="ignored_error_accordion"
            buttonContent={
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.ingestPipelines.processorOutput.ignoredErrorCodeBlockLabel"
                    defaultMessage="View ignored error"
                  />
                </p>
              </EuiText>
            }
          >
            <>
              <EuiSpacer />
              <EuiCodeBlock paddingSize="s" language="json" isCopyable>
                {JSON.stringify(ignoredError, null, 2)}
              </EuiCodeBlock>
            </>
          </EuiAccordion>
        </>
      )}
    </>
  );
};

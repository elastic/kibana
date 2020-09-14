/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiAccordion,
  EuiCallOut,
  EuiCodeBlock,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { ProcessorResult, Document } from '../../types';
import { DocumentsDropdown } from '../documents_dropdown';

export interface Props {
  processorOutput?: ProcessorResult;
  documents: Document[];
  selectedDocumentIndex: number;
  updateSelectedDocument: (index: number) => void;
}

const i18nTexts = {
  noOutputCalloutTitle: i18n.translate(
    'xpack.ingestPipelines.processorOutput.noOutputCalloutTitle',
    {
      defaultMessage: 'Unable to load the processor output.',
    }
  ),
  tabDescription: i18n.translate('xpack.ingestPipelines.processorOutput.descriptionText', {
    defaultMessage:
      'View how the processor affects the ingest document as it passes through the pipeline.',
  }),
  skippedCalloutTitle: i18n.translate('xpack.ingestPipelines.processorOutput.skippedCalloutTitle', {
    defaultMessage: 'The processor was not run.',
  }),
  droppedCalloutTitle: i18n.translate('xpack.ingestPipelines.processorOutput.droppedCalloutTitle', {
    defaultMessage: 'The document was dropped.',
  }),
  processorOutputLabel: i18n.translate(
    'xpack.ingestPipelines.processorOutput.processorOutputCodeBlockLabel',
    {
      defaultMessage: 'Processor output',
    }
  ),
  processorErrorLabel: i18n.translate(
    'xpack.ingestPipelines.processorOutput.processorErrorCodeBlockLabel',
    {
      defaultMessage: 'Processor error',
    }
  ),
  prevProcessorLabel: i18n.translate(
    'xpack.ingestPipelines.processorOutput.previousOutputCodeBlockLabel',
    {
      defaultMessage: 'View previous processor output',
    }
  ),
  processorIgnoredErrorLabel: i18n.translate(
    'xpack.ingestPipelines.processorOutput.ignoredErrorCodeBlockLabel',
    {
      defaultMessage: 'View ignored error',
    }
  ),
};

export const ProcessorOutput: React.FunctionComponent<Props> = ({
  processorOutput,
  documents,
  selectedDocumentIndex,
  updateSelectedDocument,
}) => {
  // This code should not be reached,
  // but if for some reason the output is undefined, we render a callout message
  if (!processorOutput) {
    return <EuiCallOut title={i18nTexts.noOutputCalloutTitle} color="danger" iconType="alert" />;
  }

  const {
    prevProcessorResult,
    doc: currentResult,
    ignored_error: ignoredError,
    error,
    status,
  } = processorOutput!;

  return (
    <div data-test-subj="processorOutputTabContent">
      <EuiText>
        <p>{i18nTexts.tabDescription}</p>
      </EuiText>

      {/* There is no output for "skipped" status, so we render an info callout */}
      {status === 'skipped' && (
        <>
          <EuiSpacer />
          <EuiCallOut size="s" title={i18nTexts.skippedCalloutTitle} iconType="pin" />
        </>
      )}

      {/* There is no output for "dropped status", so we render a warning callout */}
      {status === 'dropped' && (
        <>
          <EuiSpacer />
          <EuiCallOut
            size="s"
            title={i18nTexts.droppedCalloutTitle}
            iconType="pin"
            color="warning"
          />
        </>
      )}

      {currentResult && (
        <>
          <EuiSpacer />

          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="baseline">
            <EuiFlexItem>
              <p>{i18nTexts.processorOutputLabel}</p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DocumentsDropdown
                documents={documents}
                selectedDocumentIndex={selectedDocumentIndex}
                updateSelectedDocument={updateSelectedDocument}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

          <EuiCodeBlock paddingSize="s" language="json" isCopyable>
            {JSON.stringify(currentResult, null, 2)}
          </EuiCodeBlock>
        </>
      )}

      {error && (
        <>
          <EuiSpacer />

          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="baseline">
            <EuiFlexItem>
              <p>{i18nTexts.processorErrorLabel}</p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DocumentsDropdown
                documents={documents}
                selectedDocumentIndex={selectedDocumentIndex}
                updateSelectedDocument={updateSelectedDocument}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

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
                <p>{i18nTexts.prevProcessorLabel}</p>
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
                <p>{i18nTexts.processorIgnoredErrorLabel}</p>
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
    </div>
  );
};

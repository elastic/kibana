/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiAccordion,
  EuiCallOut,
  EuiCodeBlock,
  EuiText,
  EuiSpacer,
  EuiSelect,
} from '@elastic/eui';

import { SectionLoading } from '../../../../../../shared_imports';
import { ProcessorResult, Document } from '../../../types';
import { ErrorIcon, ErrorIgnoredIcon, SkippedIcon } from '../../shared';

import './processor_output.scss';

export interface Props {
  processorOutput?: ProcessorResult;
  documents: Document[];
  selectedDocumentIndex: number;
  updateSelectedDocument: (index: number) => void;
  isExecuting?: boolean;
}

const i18nTexts = {
  tabDescription: i18n.translate('xpack.ingestPipelines.processorOutput.descriptionText', {
    defaultMessage: 'Preview changes to the test document.',
  }),
  skippedCalloutTitle: i18n.translate('xpack.ingestPipelines.processorOutput.skippedCalloutTitle', {
    defaultMessage: 'The processor was not run.',
  }),
  droppedCalloutTitle: i18n.translate('xpack.ingestPipelines.processorOutput.droppedCalloutTitle', {
    defaultMessage: 'The document was dropped.',
  }),
  noOutputCalloutTitle: i18n.translate(
    'xpack.ingestPipelines.processorOutput.noOutputCalloutTitle',
    {
      defaultMessage: 'Output is not available for this processor.',
    }
  ),
  processorOutputLabel: i18n.translate(
    'xpack.ingestPipelines.processorOutput.processorOutputCodeBlockLabel',
    {
      defaultMessage: 'Data out',
    }
  ),
  processorErrorTitle: i18n.translate(
    'xpack.ingestPipelines.processorOutput.processorErrorCodeBlockLabel',
    {
      defaultMessage: 'There was an error',
    }
  ),
  prevProcessorLabel: i18n.translate(
    'xpack.ingestPipelines.processorOutput.processorInputCodeBlockLabel',
    {
      defaultMessage: 'Data in',
    }
  ),
  processorIgnoredErrorTitle: i18n.translate(
    'xpack.ingestPipelines.processorOutput.ignoredErrorCodeBlockLabel',
    {
      defaultMessage: 'There was an ignored error',
    }
  ),
  documentsDropdownLabel: i18n.translate(
    'xpack.ingestPipelines.processorOutput.documentsDropdownLabel',
    {
      defaultMessage: 'Test data:',
    }
  ),
  loadingMessage: i18n.translate('xpack.ingestPipelines.processorOutput.loadingMessage', {
    defaultMessage: 'Loading processor output…',
  }),
};

export const ProcessorOutput: FunctionComponent<Props> = ({
  processorOutput,
  documents,
  selectedDocumentIndex,
  updateSelectedDocument,
  isExecuting,
}) => {
  if (isExecuting) {
    return <SectionLoading inline>{i18nTexts.loadingMessage}</SectionLoading>;
  }

  if (!processorOutput) {
    return <EuiCallOut title={i18nTexts.noOutputCalloutTitle} color="danger" iconType="alert" />;
  }

  const {
    processorInput,
    doc: currentResult,
    ignored_error: ignoredError,
    error,
    status,
  } = processorOutput!;

  const NoOutputCallOut: FunctionComponent = () => (
    <EuiCallOut title={i18nTexts.noOutputCalloutTitle} iconType="pin" />
  );

  const getOutputContent = () => {
    switch (status) {
      case 'skipped':
        return (
          <EuiCallOut
            title={i18nTexts.skippedCalloutTitle}
            iconType={SkippedIcon}
            className="processorOutput__callOut processorOutput__callOut--customIcon"
          />
        );
      case 'dropped':
        return <EuiCallOut title={i18nTexts.droppedCalloutTitle} iconType="indexClose" />;
      case 'success':
        if (currentResult) {
          return (
            <EuiCodeBlock paddingSize="s" language="json" isCopyable>
              {JSON.stringify(currentResult, null, 2)}
            </EuiCodeBlock>
          );
        }

        return <NoOutputCallOut />;
      case 'error':
        return (
          <EuiCallOut
            iconType={ErrorIcon}
            title={i18nTexts.processorErrorTitle}
            color="danger"
            className="processorOutput__callOut processorOutput__callOut--customIcon"
          >
            <EuiCodeBlock
              language="json"
              paddingSize="none"
              className="processorOutput__callOut__codeBlock"
              transparentBackground
            >
              {JSON.stringify(error, null, 2)}
            </EuiCodeBlock>
          </EuiCallOut>
        );
      case 'error_ignored':
        return (
          <EuiCallOut
            iconType={ErrorIgnoredIcon}
            title={i18nTexts.processorIgnoredErrorTitle}
            color="warning"
            className="processorOutput__callOut processorOutput__callOut--customIcon"
          >
            <EuiCodeBlock
              className="processorOutput__callOut__codeBlock"
              language="json"
              paddingSize="none"
              transparentBackground
            >
              {JSON.stringify(ignoredError, null, 2)}
            </EuiCodeBlock>
          </EuiCallOut>
        );
      default:
        return <NoOutputCallOut />;
    }
  };

  return (
    <div data-test-subj="processorOutputTabContent" className="processorOutput">
      <EuiText>
        <p>{i18nTexts.tabDescription}</p>
      </EuiText>

      <EuiSpacer />

      {/* Documents dropdown */}
      <EuiSelect
        compressed
        options={documents.map((doc, index) => ({
          value: index,
          text: i18n.translate('xpack.ingestPipelines.processorOutput.documentLabel', {
            defaultMessage: 'Document {number}',
            values: {
              number: index + 1,
            },
          }),
        }))}
        value={selectedDocumentIndex}
        onChange={(e) => {
          updateSelectedDocument(Number(e.target.value));
        }}
        aria-label={i18nTexts.documentsDropdownLabel}
        prepend={i18nTexts.documentsDropdownLabel}
      />

      <EuiSpacer />

      {/* Data-in accordion */}
      <EuiAccordion
        id="processor_input_accordion"
        buttonContent={
          <EuiText>
            <p>{i18nTexts.prevProcessorLabel}</p>
          </EuiText>
        }
      >
        <>
          <EuiSpacer />

          <EuiCodeBlock paddingSize="s" language="json" isCopyable>
            {/* If there is no processorInput defined (i.e., it's the first processor), we provide the sample document */}
            {JSON.stringify(
              processorInput ? processorInput : documents[selectedDocumentIndex],
              null,
              2
            )}
          </EuiCodeBlock>
        </>
      </EuiAccordion>

      <EuiSpacer />

      {/* Data-out content */}
      <EuiText>
        <span>{i18nTexts.processorOutputLabel}</span>
      </EuiText>

      <EuiSpacer size="xs" />

      {getOutputContent()}
    </div>
  );
};

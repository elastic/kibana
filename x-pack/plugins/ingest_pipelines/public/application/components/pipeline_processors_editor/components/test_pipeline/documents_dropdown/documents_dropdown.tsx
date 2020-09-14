/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiButtonEmpty,
  EuiPopoverTitle,
  EuiSelectable,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { Document } from '../../../types';

import { TestPipelineFlyoutTab } from '../test_pipeline_flyout_tabs';

import './documents_dropdown.scss';

const i18nTexts = {
  dropdownLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsdropdown.dropdownLabel',
    {
      defaultMessage: 'Documents:',
    }
  ),
  addDocumentsButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsDropdown.buttonLabel',
    {
      defaultMessage: 'Add documents',
    }
  ),
  popoverTitle: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsDropdown.popoverTitle',
    {
      defaultMessage: 'Test documents',
    }
  ),
};

interface Props {
  documents: Document[];
  selectedDocumentIndex: number;
  updateSelectedDocument: (index: number) => void;
  openFlyout: (activeFlyoutTab: TestPipelineFlyoutTab) => void;
}

export const DocumentsDropdown: FunctionComponent<Props> = ({
  documents,
  selectedDocumentIndex,
  updateSelectedDocument,
  openFlyout,
}) => {
  const [showPopover, setShowPopover] = useState<boolean>(false);

  const managePipelineButton = (
    <EuiButtonEmpty
      data-test-subj="documentsButton"
      onClick={() => setShowPopover((previousBool) => !previousBool)}
      iconType="arrowDown"
      iconSide="right"
    >
      {i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.selectedDocumentLabel', {
        defaultMessage: 'Document {selectedDocument}',
        values: {
          selectedDocument: selectedDocumentIndex + 1,
        },
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      button={managePipelineButton}
      panelPaddingSize="none"
      withTitle
      repositionOnScroll
      data-test-subj="documentsDropdown"
      panelClassName="documentsDropdownPanel"
    >
      <EuiSelectable
        singleSelection
        options={documents.map((doc, index) => ({
          key: index.toString(),
          checked: selectedDocumentIndex === index ? 'on' : undefined,
          label: i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.documentLabel', {
            defaultMessage: 'Document {documentNumber}',
            values: {
              documentNumber: index + 1,
            },
          }),
        }))}
        onChange={(newOptions) => {
          const selectedOption = newOptions.find((option) => option.checked === 'on');
          if (selectedOption) {
            updateSelectedDocument(Number(selectedOption.key!));
          }

          setShowPopover(false);
        }}
      >
        {(list, search) => (
          <div>
            <EuiPopoverTitle>{i18nTexts.popoverTitle}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>

      <EuiHorizontalRule margin="xs" />

      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={() => {
              openFlyout('documents');
              setShowPopover(false);
            }}
            data-test-subj="addDocumentsButton"
          >
            {i18nTexts.addDocumentsButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </EuiPopover>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiSelect, EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { Document } from '../../types';

import './documents_dropdown.scss';
import { TestPipelineFlyoutTab } from '../test_pipeline/test_pipeline_flyout_tabs';

const i18nTexts = {
  ariaLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsDropdownAriaLabel',
    {
      defaultMessage: 'Select documents',
    }
  ),
  dropdownLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsdropdownLabel',
    {
      defaultMessage: 'Documents:',
    }
  ),
  buttonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.buttonLabel', {
    defaultMessage: 'Add documents',
  }),
  iconButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.iconButtonAriaLabel',
    {
      defaultMessage: 'Manage documents',
    }
  ),
};

const getDocumentOptions = (documents: Document[]) =>
  documents.map((doc, index) => ({
    value: index,
    text: doc._id,
  }));

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
  return (
    <div className="documentsDropdown">
      <EuiSelect
        compressed
        options={getDocumentOptions(documents)}
        value={selectedDocumentIndex}
        onChange={(e) => {
          updateSelectedDocument(Number(e.target.value));
        }}
        aria-label={i18nTexts.ariaLabel}
        append={
          <EuiToolTip content={i18nTexts.iconButtonLabel}>
            <EuiButtonIcon
              iconType="gear"
              size="s"
              aria-label={i18nTexts.iconButtonLabel}
              onClick={() => openFlyout('documents')}
            />
          </EuiToolTip>
        }
      />
    </div>
  );
};

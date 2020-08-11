/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';

import { useTestPipelineContext } from '../../context';

import { FlyoutProvider } from './flyout_provider';

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
      defaultMessage: 'Test:',
    }
  ),
};

export const DocumentsDropdown: FunctionComponent<Props> = () => {
  const { testPipelineData, setCurrentTestPipelineData } = useTestPipelineContext();

  const {
    config: { documents, selectedDocumentIndex },
  } = testPipelineData;

  const documentOptions = documents.map((doc, index) => ({
    value: index,
    text: doc._id,
  }));

  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText>
          <span>{i18nTexts.dropdownLabel}</span>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          options={documentOptions}
          value={selectedDocumentIndex}
          onChange={(e) => {
            setCurrentTestPipelineData({
              type: 'updateActiveDocument',
              payload: {
                config: {
                  selectedDocumentIndex: Number(e.target.value),
                },
              },
            });
          }}
          aria-label={i18nTexts.ariaLabel}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiHorizontalRule,
  EuiFilePicker,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';

import { WelcomeContent } from './welcome_content';

interface Props {
  onFilePickerChange(files: FileList | null): void;
}

export const AboutPanel: FC<Props> = ({ onFilePickerChange }) => {
  return (
    <EuiPageBody
      paddingSize="none"
      panelled={false}
      restrictWidth={1000}
      data-test-subj="dataVisualizerPageFileUpload"
    >
      <EuiPageContent hasShadow={false} hasBorder>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={true}>
            <WelcomeContent />

            <EuiHorizontalRule margin="l" />

            <div style={{ textAlign: 'center' }}>
              <EuiFilePicker
                id="filePicker"
                initialPromptText={i18n.translate(
                  'xpack.dataVisualizer.file.aboutPanel.selectOrDragAndDropFileDescription',
                  {
                    defaultMessage: 'Select or drag and drop a file',
                  }
                )}
                onChange={(files) => onFilePickerChange(files)}
                className="file-datavisualizer-file-picker"
              />
            </div>
            <EuiSpacer size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContent>
    </EuiPageBody>
  );
};

export const LoadingPanel: FC = () => {
  return (
    <EuiPage restrictWidth={400} data-test-subj="dataVisualizerPageFileLoading">
      <EuiPageBody>
        <EuiPageContent className="file-datavisualizer-about-panel__content" paddingSize="l">
          <div style={{ textAlign: 'center' }}>
            <EuiTitle size="s">
              <h1 role="alert">
                <FormattedMessage
                  id="xpack.dataVisualizer.file.aboutPanel.analyzingDataTitle"
                  defaultMessage="Analyzing data"
                />
              </h1>
            </EuiTitle>

            <EuiSpacer size="l" />

            <EuiLoadingSpinner size="xl" />
          </div>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

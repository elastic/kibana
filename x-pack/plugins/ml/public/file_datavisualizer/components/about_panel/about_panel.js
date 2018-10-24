/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiHorizontalRule,
  EuiFilePicker,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';

import { WelcomeContent } from './welcome_content';

export function AboutPanel({ onFilePickerChange }) {
  return (
    <EuiPage>
      <EuiPageBody restrictWidth={1000}>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="l">
              <WelcomeContent />

              <EuiHorizontalRule margin="l" />

              <div style={{ textAlign: 'center' }} >
                <EuiFilePicker
                  id="filePicker"
                  initialPromptText="Select or drag and drop a file"
                  onChange={files => onFilePickerChange(files)}
                  className="file-datavisualizer-file-picker"
                />
              </div>
            </EuiPanel>
            <EuiSpacer size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}

export function LoadingPanel() {
  return (
    <EuiPage>
      <EuiPageBody restrictWidth={200}>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="l" style={{ textAlign: 'center' }} >
              <EuiTitle size="s">
                <h3>Analyzing data</h3>
              </EuiTitle>

              <EuiSpacer size="l" />

              <EuiLoadingSpinner size="xl"/>

            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}

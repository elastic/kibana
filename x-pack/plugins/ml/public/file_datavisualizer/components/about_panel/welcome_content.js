/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export function WelcomeContent() {

  return (
    <EuiFlexGroup gutterSize="xl" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon size="xxl" type="addDataApp" className="file-datavisualizer-about-panel__icon" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="m">
          <h3>
            Visualize data from a log file
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            The File Data Visualizer helps you understand the fields and metrics in a log file.
            Upload your file, analyze its data, and then choose which data to import into your Elasticsearch index.
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            The File Data Visualizer supports these file formats:
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false} className="file-datavisualizer-about-panel__doc-icon">
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                JSON
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false} className="file-datavisualizer-about-panel__doc-icon">
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                Delimited text files, such as CSV and TSV
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false} className="file-datavisualizer-about-panel__doc-icon">
            <EuiIcon size="m" type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                Log files with a common format for the timestamp
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            You can upload files up to 100 MB.
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            This feature is experimental. Got feedback? Please create an issue in&nbsp;
            <EuiLink
              href="https://github.com/elastic/kibana/issues/new"
              target="_blank"
            >
              GitHub
            </EuiLink>.
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

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
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export function AboutPanel() {

  return (
    <EuiPanel paddingSize="l">
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
              The Machine Learning Data Visualizer helps you understand the fields and metrics
              in a log file as preparation for further analysis. After analyzing the data in the
              file you can then choose to import the data into an elasticsearch index.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              Select the file to visualize using the button at the top of the page,
              and we will then attempt to analyze its structure.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              The log file formats we currently support are:
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiIcon size="l" type="document" />
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
            <EuiFlexItem grow={false}>
              <EuiIcon size="l" type="document" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <p>
                  Delimited text files such as CSV and TSV
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiIcon size="l" type="document" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <p>
                  Log files consisting of semi-structured text with the timestamp in each message having a common format
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              Files up to 100MB in size can be uploaded.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              This is an experimental feature. For any feedback please create an issue in&nbsp;
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

    </EuiPanel>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';


function startTrialDescription() {
  return (
    <span>
      To experience what the full Machine Learning features of a {' '}
      <EuiLink
        href="https://www.elastic.co/subscriptions"
        target="_blank"
      >
        Platinum subscription
      </EuiLink>{' '}
      have to offer, start a 30-day trial from the license management page.
    </span>
  );
}


export function DatavisualizerSelector() {

  // TODO - add correct logic for determining whether to show the link to the
  // license management page allowing the user to start a trial of the Platinum feature set.
  const shouldShowStartTrialLink = true;

  return (
    <EuiPage>
      <EuiPageBody restrictWidth={1000}>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2>Data Visualizer</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued">
              The Machine Learning Data Visualizer tool helps you understand your data, by analyzing the metrics and fields in
              an existing Elasticsearch index or in a log file.
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup justifyContent="spaceAround" gutterSize="xl">
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="addDataApp" />}
              title="Import data"
              description="Visualize data from a log file. Supported for files up to 100MB in size."
              betaBadgeLabel="Experimental"
              betaBadgeTooltipContent="Experimental feature. Please help us by reporting any bugs."
              footer={
                <EuiButton
                  target="_self"
                  href="#/filedatavisualizer"
                >
                  Select file
                </EuiButton>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="dataVisualizer" />}
              title="Pick index pattern"
              description="Visualize data in an existing Elasticsearch index."
              footer={
                <EuiButton
                  target="_self"
                  href="#datavisualizer_index_select"
                >
                  Select index
                </EuiButton>
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {shouldShowStartTrialLink === true &&
          <React.Fragment>
            <EuiSpacer size="xxl" />
            <EuiSpacer size="xxl" />
            <EuiFlexGroup justifyContent="spaceAround" gutterSize="xl">
              <EuiFlexItem grow={false} style={{ width: '600px' }}>
                <EuiCard
                  title="Start trial"
                  description={startTrialDescription()}
                  footer={
                    <EuiButton
                      target="_blank"
                      href="kibana#/management/elasticsearch/license_management/home"
                    >
                      Start trial
                    </EuiButton>
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </React.Fragment>
        }
      </EuiPageBody>
    </EuiPage>
  );
}

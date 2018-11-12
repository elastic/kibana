/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
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

import { isFullLicense } from '../../license/check_license';

function startTrialDescription() {
  return (
    <span>
      <FormattedMessage
        id="xpack.machineLearning.datavisualizer.startTrial.fullMachineLearningFeaturesDescription"
        defaultMessage="To experience the full Machine Learning features that a "
      />
      <EuiLink
        href="https://www.elastic.co/subscriptions"
        target="_blank"
      >
        <FormattedMessage
          id="xpack.machineLearning.datavisualizer.startTrial.platinumSubscriptionTitle"
          defaultMessage="Platinum subscription"
        />
      </EuiLink>
      <FormattedMessage
        id="xpack.machineLearning.datavisualizer.startTrial.platinumSubscriptionDescription"
        defaultMessage=" offers, start a 30-day trial."
      />
    </span>
  );
}


export function DatavisualizerSelector() {

  const startTrialVisible = (isFullLicense() === false);

  return (
    <EuiPage restrictWidth={1000}>
      <EuiPageBody>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2>
                <FormattedMessage
                  id="xpack.machineLearning.datavisualizer.datavisualizerSelector.dataVisualizerTitle"
                  defaultMessage="Data Visualizer"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.machineLearning.datavisualizer.datavisualizerSelector.dataVisualizerDescription"
                // eslint-disable-next-line max-len
                defaultMessage="The Machine Learning Data Visualizer tool helps you understand your data, by analyzing the metrics and fields in a log file or an existing Elasticsearch index."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup justifyContent="spaceAround" gutterSize="xl">
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="addDataApp" />}
              title={
                <FormattedMessage
                  id="xpack.machineLearning.datavisualizer.datavisualizerSelector.importDataTitle"
                  defaultMessage="Import data"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.machineLearning.datavisualizer.datavisualizerSelector.importDataDescription"
                  defaultMessage="Import data from a log file. You can upload files up to 100 MB."
                />
              }
              betaBadgeLabel={
                <FormattedMessage
                  id="xpack.machineLearning.datavisualizer.datavisualizerSelector.experimentalBadgeLabel"
                  defaultMessage="Experimental"
                />
              }
              betaBadgeTooltipContent={
                <FormattedMessage
                  id="xpack.machineLearning.datavisualizer.datavisualizerSelector.experimentalBadgeTooltipLabel"
                  defaultMessage="Experimental feature. We'd love to hear your feedback."
                />
              }
              footer={
                <EuiButton
                  target="_self"
                  href="#/filedatavisualizer"
                >
                  <FormattedMessage
                    id="xpack.machineLearning.datavisualizer.datavisualizerSelector.uploadFileButtonLabel"
                    defaultMessage="Upload file"
                  />
                </EuiButton>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="dataVisualizer" />}
              title={
                <FormattedMessage
                  id="xpack.machineLearning.datavisualizer.datavisualizerSelector.selectIndexPatternTitle"
                  defaultMessage="Select an index pattern"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.machineLearning.datavisualizer.datavisualizerSelector.selectIndexPatternDescription"
                  defaultMessage="Visualize the data in an existing Elasticsearch index."
                />
              }
              footer={
                <EuiButton
                  target="_self"
                  href="#datavisualizer_index_select"
                >
                  <FormattedMessage
                    id="xpack.machineLearning.datavisualizer.datavisualizerSelector.selectIndexButtonLabel"
                    defaultMessage="Select index"
                  />
                </EuiButton>
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {startTrialVisible === true &&
          <React.Fragment>
            <EuiSpacer size="xxl" />
            <EuiSpacer size="xxl" />
            <EuiFlexGroup justifyContent="spaceAround" gutterSize="xl">
              <EuiFlexItem grow={false} style={{ width: '600px' }}>
                <EuiCard
                  title={
                    <FormattedMessage
                      id="xpack.machineLearning.datavisualizer.datavisualizerSelector.startTrialTitle"
                      defaultMessage="Start trial"
                    />
                  }
                  description={startTrialDescription()}
                  footer={
                    <EuiButton
                      target="_blank"
                      href="kibana#/management/elasticsearch/license_management/home"
                    >
                      <FormattedMessage
                        id="xpack.machineLearning.datavisualizer.datavisualizerSelector.startTrialButtonLabel"
                        defaultMessage="Start trial"
                      />
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

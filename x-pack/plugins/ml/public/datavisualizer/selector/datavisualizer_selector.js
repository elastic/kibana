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

import { isFullLicense } from '../../license/check_license';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function startTrialDescription() {
  return (
    <span>
      <FormattedMessage
        id="xpack.ml.datavisualizer.startTrial.fullMLFeaturesDescription"
        defaultMessage="To experience the full Machine Learning features that a {platinumSubscriptionLink} offers, start a 30-day trial."
        values={{
          platinumSubscriptionLink: (
            <EuiLink
              href="https://www.elastic.co/subscriptions"
              target="_blank"
            >
              <FormattedMessage
                id="xpack.ml.datavisualizer.startTrial.platinumSubscriptionTitle"
                defaultMessage="Platinum subscription"
              />
            </EuiLink>
          )
        }}
      />
    </span>
  );
}


export const DatavisualizerSelector = injectI18n(function (props) {

  const startTrialVisible = (isFullLicense() === false);

  return (
    <EuiPage restrictWidth={1000}>
      <EuiPageBody>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2>
                <FormattedMessage
                  id="xpack.ml.datavisualizer.selector.dataVisualizerTitle"
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
                id="xpack.ml.datavisualizer.selector.dataVisualizerDescription"
                defaultMessage="The Machine Learning Data Visualizer tool helps you understand your data,
                  by analyzing the metrics and fields in a log file or an existing Elasticsearch index."
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
                  id="xpack.ml.datavisualizer.selector.importDataTitle"
                  defaultMessage="Import data"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.ml.datavisualizer.selector.importDataDescription"
                  defaultMessage="Import data from a log file. You can upload files up to 100 MB."
                />
              }
              betaBadgeLabel={props.intl.formatMessage({
                id: 'xpack.ml.datavisualizer.selector.experimentalBadgeLabel',
                defaultMessage: 'Experimental'
              })}
              betaBadgeTooltipContent={
                <FormattedMessage
                  id="xpack.ml.datavisualizer.selector.experimentalBadgeTooltipLabel"
                  defaultMessage="Experimental feature. We'd love to hear your feedback."
                />
              }
              footer={
                <EuiButton
                  target="_self"
                  href="#/filedatavisualizer"
                >
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.uploadFileButtonLabel"
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
                  id="xpack.ml.datavisualizer.selector.selectIndexPatternTitle"
                  defaultMessage="Select an index pattern"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.ml.datavisualizer.selector.selectIndexPatternDescription"
                  defaultMessage="Visualize the data in an existing Elasticsearch index."
                />
              }
              footer={
                <EuiButton
                  target="_self"
                  href="#datavisualizer_index_select"
                >
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.selectIndexButtonLabel"
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
                      id="xpack.ml.datavisualizer.selector.startTrialTitle"
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
                        id="xpack.ml.datavisualizer.selector.startTrialButtonLabel"
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
});

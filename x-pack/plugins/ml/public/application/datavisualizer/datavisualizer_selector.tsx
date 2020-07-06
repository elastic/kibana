/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';

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
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n/react';
import { isFullLicense } from '../license';
import { useTimefilter, useMlKibana } from '../contexts/kibana';

import { NavigationMenu } from '../components/navigation_menu';
import { getMaxBytesFormatted } from './file_based/components/utils';

function startTrialDescription() {
  return (
    <span>
      <FormattedMessage
        id="xpack.ml.datavisualizer.startTrial.fullMLFeaturesDescription"
        defaultMessage="To experience the full Machine Learning features that a {subscriptionsLink} offers, start a 30-day trial."
        values={{
          subscriptionsLink: (
            <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
              <FormattedMessage
                id="xpack.ml.datavisualizer.startTrial.subscriptionsLinkText"
                defaultMessage="Platinum or Enterprise subscription"
              />
            </EuiLink>
          ),
        }}
      />
    </span>
  );
}

export const DatavisualizerSelector: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: { licenseManagement },
  } = useMlKibana();

  const startTrialVisible =
    licenseManagement !== undefined &&
    licenseManagement.enabled === true &&
    isFullLicense() === false;

  const maxFileSize = getMaxBytesFormatted();

  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      <EuiPage restrictWidth={1000} data-test-subj="mlPageDataVisualizerSelector">
        <EuiPageBody>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.dataVisualizerTitle"
                    defaultMessage="Data Visualizer"
                  />
                </h1>
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
                    defaultMessage="Import data from a log file. You can upload files up to {maxFileSize}."
                    values={{ maxFileSize }}
                  />
                }
                betaBadgeLabel={i18n.translate(
                  'xpack.ml.datavisualizer.selector.experimentalBadgeLabel',
                  {
                    defaultMessage: 'Experimental',
                  }
                )}
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
                    data-test-subj="mlDataVisualizerUploadFileButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.uploadFileButtonLabel"
                      defaultMessage="Upload file"
                    />
                  </EuiButton>
                }
                data-test-subj="mlDataVisualizerCardImportData"
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
                    href="#/datavisualizer_index_select"
                    data-test-subj="mlDataVisualizerSelectIndexButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.selectIndexButtonLabel"
                      defaultMessage="Select index"
                    />
                  </EuiButton>
                }
                data-test-subj="mlDataVisualizerCardIndexData"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {startTrialVisible === true && (
            <Fragment>
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
                      <EuiButton target="_blank" href="management/stack/license_management/home">
                        <FormattedMessage
                          id="xpack.ml.datavisualizer.selector.startTrialButtonLabel"
                          defaultMessage="Start trial"
                        />
                      </EuiButton>
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          )}
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};

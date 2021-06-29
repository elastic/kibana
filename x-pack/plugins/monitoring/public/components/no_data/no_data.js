/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiSpacer,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText,
  EuiTitle,
  EuiTextColor,
  EuiButtonEmpty,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { toggleSetupMode } from '../../lib/setup_mode';
import { CheckingSettings } from './checking_settings';
import { ReasonFound, WeTried } from './reasons';
import { CheckerErrors } from './checker_errors';
import { CloudDeployment } from './blurbs';
import { getSafeForExternalLink } from '../../lib/get_safe_for_external_link';

function NoDataMessage(props) {
  const { isLoading, reason, checkMessage } = props;

  if (isLoading) {
    return <CheckingSettings checkMessage={checkMessage} />;
  }

  if (reason) {
    return <ReasonFound {...props} />;
  }

  return <WeTried />;
}

export function NoData(props) {
  const [isLoading, setIsLoading] = useState(false);
  const [useInternalCollection, setUseInternalCollection] = useState(false);
  const isCloudEnabled = props.isCloudEnabled;

  async function startSetup() {
    setIsLoading(true);
    await toggleSetupMode(true);
    window.location.hash = getSafeForExternalLink('#/elasticsearch/nodes');
  }

  if (isCloudEnabled) {
    return (
      <EuiPage>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.noData.cloud.heading"
              defaultMessage="No monitoring data found."
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPageBody restrictWidth={600}>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            className="eui-textCenter"
          >
            <EuiIcon type="monitoringApp" size="xxl" />
            <EuiSpacer size="m" />
            <EuiTitle size="l">
              <h2>
                <FormattedMessage
                  id="xpack.monitoring.noData.cloud.title"
                  defaultMessage="Monitoring data not available"
                />
              </h2>
            </EuiTitle>
            <EuiTextColor color="subdued">
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.monitoring.noData.cloud.description"
                    defaultMessage="Monitoring provides insight to your hardware performance and load."
                  />
                </p>
              </EuiText>
            </EuiTextColor>
            <EuiHorizontalRule size="half" />
            <CloudDeployment />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  if (useInternalCollection) {
    return (
      <EuiPage>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.no_data.internal_collection.heading"
              defaultMessage="No monitoring data found."
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPageBody restrictWidth={600}>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            className="eui-textCenter"
          >
            <EuiIcon type="monitoringApp" size="xxl" />
            <EuiSpacer size="m" />
            <NoDataMessage {...props} />
            <CheckerErrors errors={props.errors} />
            {!props.isCloudEnabled ? (
              <Fragment>
                <EuiHorizontalRule size="half" />
                <EuiButtonEmpty
                  isDisabled={props.isCollectionEnabledUpdated}
                  onClick={() => setUseInternalCollection(false)}
                >
                  <EuiTextColor color="default">
                    <FormattedMessage
                      id="xpack.monitoring.noData.setupMetricbeatInstead"
                      defaultMessage="Or, set up with Metricbeat (recommended)"
                    />
                  </EuiTextColor>
                </EuiButtonEmpty>
              </Fragment>
            ) : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  return (
    <EuiPage>
      <EuiScreenReaderOnly>
        <h1>
          <FormattedMessage
            id="xpack.monitoring.no_data.heading"
            defaultMessage="No monitoring data found."
          />
        </h1>
      </EuiScreenReaderOnly>
      <EuiPageBody restrictWidth={600}>
        <EuiPageContent
          verticalPosition="center"
          horizontalPosition="center"
          className="eui-textCenter"
        >
          <EuiIcon type="monitoringApp" size="xxl" />
          <EuiSpacer size="m" />
          <EuiTitle size="l">
            <h2>
              <FormattedMessage
                id="xpack.monitoring.noData.noMonitoringDetected"
                defaultMessage="No monitoring data found"
              />
            </h2>
          </EuiTitle>
          <EuiHorizontalRule size="half" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.monitoring.noData.noMonitoringDataFound"
                defaultMessage="Have you set up monitoring yet? If so, make sure that the selected time period in
                the upper right includes monitoring data."
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={true}
                onClick={startSetup}
                type="button"
                data-test-subj="enableCollectionInterval"
                isLoading={isLoading}
              >
                <FormattedMessage
                  id="xpack.monitoring.noData.collectionInterval.turnOnMonitoringButtonLabel"
                  defaultMessage="Set up monitoring with Metricbeat"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule size="half" />
          <EuiButtonEmpty
            onClick={() => setUseInternalCollection(true)}
            data-test-subj="useInternalCollection"
          >
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.monitoring.noData.setupInternalInstead"
                defaultMessage="Or, set up with self monitoring"
              />
            </EuiTextColor>
          </EuiButtonEmpty>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

NoData.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  reason: PropTypes.object,
  checkMessage: PropTypes.string,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiLink } from '@elastic/eui';
import { Legacy } from '../legacy_shims';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { isInSetupMode, toggleSetupMode } from './setup_mode';

export interface MonitoringIndicesTypes {
  legacyIndices: number;
  metricbeatIndices: number;
}

const enterSetupModeLabel = () =>
  i18n.translate('xpack.monitoring.internalMonitoringToast.enterSetupMode', {
    defaultMessage: 'Enter setup mode',
  });

const learnMoreLabel = () =>
  i18n.translate('xpack.monitoring.internalMonitoringToast.learnMoreAction', {
    defaultMessage: 'Learn more',
  });

const showIfLegacyOnlyIndices = () => {
  const { ELASTIC_WEBSITE_URL } = Legacy.shims.docLinks;
  const toast = Legacy.shims.toastNotifications.addWarning({
    title: toMountPoint(
      <FormattedMessage
        id="xpack.monitoring.internalMonitoringToast.title"
        defaultMessage="Internal Monitoring Detected"
      />
    ),
    text: toMountPoint(
      <div>
        <p>
          {i18n.translate('xpack.monitoring.internalMonitoringToast.description', {
            defaultMessage: `It appears you are using "Legacy Collection" for Stack Monitoring.
            This method of monitoring will no longer be supported in the next major release (8.0.0).
            Please follow the steps in setup mode to start monitoring with Metricbeat.`,
          })}
        </p>
        <EuiLink
          onClick={() => {
            Legacy.shims.toastNotifications.remove(toast);
            toggleSetupMode(true);
          }}
        >
          {enterSetupModeLabel()}
        </EuiLink>

        <EuiSpacer />
        <EuiLink
          href={`${ELASTIC_WEBSITE_URL}blog/external-collection-for-elastic-stack-monitoring-is-now-available-via-metricbeat`}
          external
          target="_blank"
        >
          {learnMoreLabel()}
        </EuiLink>
      </div>
    ),
  });
};

const showIfLegacyAndMetricbeatIndices = () => {
  const { ELASTIC_WEBSITE_URL } = Legacy.shims.docLinks;
  const toast = Legacy.shims.toastNotifications.addWarning({
    title: toMountPoint(
      <FormattedMessage
        id="xpack.monitoring.internalAndMetricbeatMonitoringToast.title"
        defaultMessage="Partial Legacy Monitoring Detected"
      />
    ),
    text: toMountPoint(
      <div>
        <p>
          {i18n.translate('xpack.monitoring.internalAndMetricbeatMonitoringToast.description', {
            defaultMessage: `It appears you are using both Metricbeat and "Legacy Collection" for Stack Monitoring.
            In 8.0.0, you must use Metricbeat to collect monitoring data.
            Please follow the steps in setup mode to migrate the rest of the monitoring to Metricbeat.`,
          })}
        </p>
        <EuiLink
          onClick={() => {
            Legacy.shims.toastNotifications.remove(toast);
            toggleSetupMode(true);
          }}
        >
          {enterSetupModeLabel()}
        </EuiLink>

        <EuiSpacer />
        <EuiLink
          href={`${ELASTIC_WEBSITE_URL}blog/external-collection-for-elastic-stack-monitoring-is-now-available-via-metricbeat`}
          external
          target="_blank"
        >
          {learnMoreLabel()}
        </EuiLink>
      </div>
    ),
  });
};

export const showInternalMonitoringToast = ({
  legacyIndices,
  metricbeatIndices,
}: MonitoringIndicesTypes) => {
  if (isInSetupMode()) {
    return;
  }

  if (legacyIndices && !metricbeatIndices) {
    showIfLegacyOnlyIndices();
  } else if (legacyIndices && metricbeatIndices) {
    showIfLegacyAndMetricbeatIndices();
  }
};

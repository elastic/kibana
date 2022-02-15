/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AnomalyDetectionSetupState } from '../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import { useMlManageJobsHref } from '../../../hooks/use_ml_manage_jobs_href';
import { APMLink } from '../links/apm/apm_link';

export function shouldDisplayMlCallout(
  anomalyDetectionSetupState: AnomalyDetectionSetupState
) {
  return (
    anomalyDetectionSetupState === AnomalyDetectionSetupState.NoJobs ||
    anomalyDetectionSetupState === AnomalyDetectionSetupState.UpgradeableJobs ||
    anomalyDetectionSetupState === AnomalyDetectionSetupState.LegacyJobs
  );
}

export function MLCallout({
  onDismiss,
  onUpgradeClick,
  onCreateJobClick,
  anomalyDetectionSetupState,
  isOnSettingsPage,
}: {
  anomalyDetectionSetupState: AnomalyDetectionSetupState;
  onDismiss?: () => void;
  onUpgradeClick?: () => any;
  onCreateJobClick?: () => void;
  isOnSettingsPage: boolean;
  append?: React.ReactElement;
}) {
  const [loading, setLoading] = useState(false);

  const mlManageJobsHref = useMlManageJobsHref();

  let properties:
    | {
        primaryAction: React.ReactNode | undefined;
        color: 'primary' | 'success' | 'danger' | 'warning';
        title: string;
        icon: string;
        text: string;
      }
    | undefined;

  const getLearnMoreLink = (color: 'primary' | 'success') => (
    <EuiButton color={color}>
      <APMLink
        path="/settings/anomaly-detection"
        style={{ whiteSpace: 'nowrap' }}
        color={color}
      >
        {i18n.translate('xpack.apm.mlCallout.learnMoreButton', {
          defaultMessage: `Learn more`,
        })}
      </APMLink>
    </EuiButton>
  );

  switch (anomalyDetectionSetupState) {
    case AnomalyDetectionSetupState.NoJobs:
      properties = {
        title: i18n.translate('xpack.apm.mlCallout.noJobsCalloutTitle', {
          defaultMessage:
            'Enable anomaly detection to add health status indicators to your services',
        }),
        text: i18n.translate('xpack.apm.mlCallout.noJobsCalloutText', {
          defaultMessage: `Pinpoint anomalous transactions and see the health of upstream and downstream services with APM's anomaly detection integration. Get started in just a few minutes.`,
        }),
        icon: 'iInCircle',
        color: 'primary',
        primaryAction: isOnSettingsPage ? (
          <EuiButton
            color="primary"
            onClick={() => {
              onCreateJobClick?.();
            }}
          >
            {i18n.translate('xpack.apm.mlCallout.noJobsCalloutButtonText', {
              defaultMessage: 'Create ML Job',
            })}
          </EuiButton>
        ) : (
          getLearnMoreLink('primary')
        ),
      };
      break;

    case AnomalyDetectionSetupState.UpgradeableJobs:
      properties = {
        title: i18n.translate(
          'xpack.apm.mlCallout.updateAvailableCalloutTitle',
          { defaultMessage: 'Updates available' }
        ),
        text: i18n.translate('xpack.apm.mlCallout.updateAvailableCalloutText', {
          defaultMessage:
            'We have updated the anomaly detection jobs that provide insights into degraded performance and added detectors for throughput and failed transaction rate. If you choose to upgrade, we will create the new jobs and close the existing legacy jobs. The data shown in the APM app will automatically switch to the new. Please note that the option to migrate all existing jobs will not be available if you choose to create a new job.',
        }),
        color: 'success',
        icon: 'wrench',
        primaryAction: isOnSettingsPage ? (
          <EuiButton
            color="success"
            isLoading={loading}
            onClick={() => {
              setLoading(true);
              Promise.resolve(onUpgradeClick?.()).finally(() => {
                setLoading(false);
              });
            }}
          >
            {i18n.translate(
              'xpack.apm.mlCallout.updateAvailableCalloutButtonText',
              {
                defaultMessage: 'Update jobs',
              }
            )}
          </EuiButton>
        ) : (
          getLearnMoreLink('success')
        ),
      };
      break;

    case AnomalyDetectionSetupState.LegacyJobs:
      properties = {
        title: i18n.translate('xpack.apm.mlCallout.legacyJobsCalloutTitle', {
          defaultMessage: 'Legacy ML jobs are no longer used in APM app',
        }),
        text: i18n.translate('xpack.apm.mlCallout.legacyJobsCalloutText', {
          defaultMessage:
            'We have discovered legacy Machine Learning jobs from our previous integration which are no longer being used in the APM app',
        }),
        icon: 'iInCircle',
        color: 'primary',
        primaryAction: (
          <EuiButton href={mlManageJobsHref}>
            {i18n.translate(
              'xpack.apm.settings.anomaly_detection.legacy_jobs.button',
              { defaultMessage: 'Review jobs' }
            )}
          </EuiButton>
        ),
      };
      break;
  }

  if (!properties) {
    return null;
  }

  const dismissable = !isOnSettingsPage;

  const hasAnyActions = properties.primaryAction || dismissable;

  const actions = hasAnyActions ? (
    <EuiFlexGrid gutterSize="s">
      {properties.primaryAction && (
        <EuiFlexItem grow={false}>{properties.primaryAction}</EuiFlexItem>
      )}
      {dismissable && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onDismiss} color={properties.color}>
            {i18n.translate('xpack.apm.mlCallout.dismissButton', {
              defaultMessage: `Dismiss`,
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGrid>
  ) : null;

  return (
    <EuiCallOut
      title={properties.title}
      iconType={properties.icon}
      color={properties.color}
    >
      <p>{properties.text}</p>
      {actions}
    </EuiCallOut>
  );
}

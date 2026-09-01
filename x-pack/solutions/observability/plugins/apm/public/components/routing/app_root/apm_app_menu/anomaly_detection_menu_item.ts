/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { AnomalyDetectionSetupState } from '../../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import { getEnvironmentLabel } from '../../../../../common/environment_filter_values';
import { APM_APP_MENU_EBT_ACTIONS, apmAppMenuEbt } from './ebt_constants';

const ANOMALY_DETECTION_LINK_LABEL = i18n.translate('xpack.apm.anomalyDetectionSetup.linkLabel', {
  defaultMessage: 'Anomaly detection',
});

export function getAnomalyDetectionMenuItem({
  canCreateMlJobs,
  anomalyDetectionSetupState,
  preferredEnvironment,
  href,
  order,
}: {
  canCreateMlJobs: boolean;
  anomalyDetectionSetupState: AnomalyDetectionSetupState;
  preferredEnvironment: string;
  href: string;
  order: number;
}): AppMenuItemType | undefined {
  if (!canCreateMlJobs) {
    return undefined;
  }

  const { iconType, tooltipContent, isLoading } = getAnomalyDetectionMenuPresentation(
    anomalyDetectionSetupState,
    preferredEnvironment
  );

  return {
    id: 'anomalyDetection',
    label: ANOMALY_DETECTION_LINK_LABEL,
    iconType,
    href,
    ebt: apmAppMenuEbt(APM_APP_MENU_EBT_ACTIONS.VIEW_ANOMALY_DETECTION),
    testId: 'apmAnomalyDetectionHeaderLink',
    tooltipContent,
    isLoading,
    order,
    overflow: true,
  };
}

function getAnomalyDetectionMenuPresentation(
  state: AnomalyDetectionSetupState,
  preferredEnvironment: string
): { iconType: IconType; tooltipContent?: string; isLoading: boolean } {
  if (state === AnomalyDetectionSetupState.Failure) {
    return {
      iconType: 'machineLearningApp',
      tooltipContent: i18n.translate('xpack.apm.anomalyDetectionSetup.jobFetchFailureText', {
        defaultMessage: 'Could not determine state of anomaly detection setup.',
      }),
      isLoading: false,
    };
  }

  if (
    state === AnomalyDetectionSetupState.NoJobs ||
    state === AnomalyDetectionSetupState.NoJobsForEnvironment
  ) {
    return {
      iconType: 'machineLearningApp',
      tooltipContent: getNoJobsMessage(state, preferredEnvironment),
      isLoading: false,
    };
  }

  if (state === AnomalyDetectionSetupState.UpgradeableJobs) {
    return {
      iconType: 'wrench',
      tooltipContent: i18n.translate('xpack.apm.anomalyDetectionSetup.upgradeableJobsText', {
        defaultMessage: 'Updates available for existing anomaly detection jobs.',
      }),
      isLoading: false,
    };
  }

  return {
    iconType: 'machineLearningApp',
    isLoading: state === AnomalyDetectionSetupState.Loading,
  };
}

function getNoJobsMessage(
  state: AnomalyDetectionSetupState.NoJobs | AnomalyDetectionSetupState.NoJobsForEnvironment,
  environment: string
) {
  if (state === AnomalyDetectionSetupState.NoJobs) {
    return i18n.translate('xpack.apm.anomalyDetectionSetup.notEnabledText', {
      defaultMessage: `Anomaly detection is not yet enabled. Click to continue setup.`,
    });
  }

  return i18n.translate('xpack.apm.anomalyDetectionSetup.notEnabledForEnvironmentText', {
    defaultMessage: `Anomaly detection is not yet enabled for the environment "{currentEnvironment}". Click to continue setup.`,
    values: { currentEnvironment: getEnvironmentLabel(environment) },
  });
}

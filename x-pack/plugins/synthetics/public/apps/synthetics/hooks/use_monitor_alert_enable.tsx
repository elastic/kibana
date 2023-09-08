/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { isStatusEnabled } from '../../../../common/runtime_types/monitor_management/alert_config';
import { ConfigKey, EncryptedSyntheticsMonitor } from '../components/monitors_page/overview/types';
import { enableMonitorAlertAction, selectMonitorUpsertStatuses } from '../state';

export interface EnableStateMonitorLabels {
  failureLabel: string;
  enabledSuccessLabel: string;
  disabledSuccessLabel: string;
}

export function useMonitorAlertEnable() {
  const dispatch = useDispatch();
  const upsertStatuses = useSelector(selectMonitorUpsertStatuses);
  const alertStatus = useCallback(
    (configId: string) => upsertStatuses[configId]?.alertStatus,
    [upsertStatuses]
  );

  const updateAlertEnabledState = useCallback(
    ({
      monitor,
      name,
      configId,
    }: {
      monitor: Partial<EncryptedSyntheticsMonitor>;
      configId: string;
      name: string;
    }) => {
      dispatch(
        enableMonitorAlertAction.get({
          configId,
          monitor,
          success: {
            message: isStatusEnabled(monitor[ConfigKey.ALERT_CONFIG])
              ? enabledSuccessLabel(name)
              : disabledSuccessLabel(name),
            lifetimeMs: 3000,
            testAttribute: 'uptimeMonitorAlertUpdateSuccess',
          },
          error: {
            message: {
              title: enabledFailLabel(name),
            },
            lifetimeMs: 10000,
            testAttribute: 'uptimeMonitorAlertEnabledUpdateFailure',
          },
        })
      );
    },
    [dispatch]
  );

  return { updateAlertEnabledState, alertStatus };
}
const enabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.enabledSuccessLabel.alert', {
    defaultMessage: 'Alerts are now enabled for the monitor "{name}".',
    values: { name },
  });

const disabledSuccessLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.disabledSuccessLabel.alert', {
    defaultMessage: 'Alerts are now disabled for the monitor "{name}".',
    values: { name },
  });

const enabledFailLabel = (name: string) =>
  i18n.translate('xpack.synthetics.overview.actions.enabledFailLabel.alert', {
    defaultMessage: 'Unable to enable status alerts for monitor "{name}".',
    values: { name },
  });

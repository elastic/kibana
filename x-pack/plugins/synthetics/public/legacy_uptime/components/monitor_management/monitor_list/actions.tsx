/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexItem, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import { usePrivateLocationPermissions } from '../hooks/use_private_location_permission';
import { CANNOT_SAVE_INTEGRATION_LABEL } from '../monitor_config/locations';
import { UptimeSettingsContext } from '../../../contexts';
import { DeleteMonitor } from './delete_monitor';
import { InlineError } from './inline_error';
import {
  BrowserFields,
  ConfigKey,
  MonitorManagementListResult,
  SourceType,
  Ping,
} from '../../../../../common/runtime_types';

interface Props {
  id: string;
  name: string;
  isDisabled?: boolean;
  onUpdate: () => void;
  errorSummaries?: Ping[];
  monitors: MonitorManagementListResult['monitors'];
}

export const Actions = ({ id, name, onUpdate, isDisabled, errorSummaries, monitors }: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);

  let errorSummary = errorSummaries?.find((summary) => summary.config_id === id);

  const monitor = monitors.find((monitorT) => monitorT.id === id);
  const isProjectMonitor =
    (monitor?.attributes as BrowserFields)[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT;

  if (errorSummary && monitor) {
    const summaryIsBeforeUpdate = moment(monitor.updated_at).isBefore(
      moment(errorSummary.timestamp)
    );
    if (!summaryIsBeforeUpdate) {
      errorSummary = undefined;
    }
  }

  const { canUpdatePrivateMonitor } = usePrivateLocationPermissions(
    monitor?.attributes as BrowserFields
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={!canUpdatePrivateMonitor ? CANNOT_SAVE_INTEGRATION_LABEL : ''}>
          <EuiButtonIcon
            isDisabled={isDisabled || !canUpdatePrivateMonitor}
            iconType="pencil"
            href={`${basePath}/app/uptime/edit-monitor/${id}`}
            aria-label={EDIT_MONITOR_LABEL}
            data-test-subj="monitorManagementEditMonitor"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            isProjectMonitor
              ? i18n.translate('xpack.synthetics.monitorManagement.monitorList.enabled.tooltip', {
                  defaultMessage:
                    'This monitor was added from an external project. To delete the monitor, remove it from the project and push the configuration again.',
                })
              : ''
          }
        >
          <DeleteMonitor
            onUpdate={onUpdate}
            name={name}
            id={id}
            isDisabled={isDisabled || isProjectMonitor || !canUpdatePrivateMonitor}
          />
        </EuiToolTip>
      </EuiFlexItem>
      {errorSummary && (
        <EuiFlexItem>
          <InlineError errorSummary={errorSummary} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const EDIT_MONITOR_LABEL = i18n.translate('xpack.synthetics.monitorManagement.editMonitorLabel', {
  defaultMessage: 'Edit monitor',
});

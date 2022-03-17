/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import moment from 'moment';
import { UptimeSettingsContext } from '../../../contexts';
import { DeleteMonitor } from './delete_monitor';
import { InlineError } from './inline_error';
import { MonitorManagementListResult, Ping } from '../../../../common/runtime_types';

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

  if (errorSummary && monitor) {
    const summaryIsBeforeUpdate = moment(monitor.updated_at).isBefore(
      moment(errorSummary.timestamp)
    );
    if (!summaryIsBeforeUpdate) {
      errorSummary = undefined;
    }
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          isDisabled={isDisabled}
          iconType="pencil"
          href={`${basePath}/app/uptime/edit-monitor/${Buffer.from(id, 'utf8').toString('base64')}`}
          aria-label={EDIT_MONITOR_LABEL}
          data-test-subj="monitorManagementEditMonitor"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DeleteMonitor onUpdate={onUpdate} name={name} id={id} isDisabled={isDisabled} />
      </EuiFlexItem>
      {errorSummary && (
        <EuiFlexItem>
          <InlineError errorSummary={errorSummary} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const EDIT_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.editMonitorLabel', {
  defaultMessage: 'Edit monitor',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment, { Duration } from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';
import { padLeft } from 'lodash';
import { RawAlertInstance } from '../../../../../../../legacy/plugins/alerting/server';
import { Alert, AlertTaskState } from '../../../../types';
interface AlertInstancesProps {
  alert: Alert;
  alertState: AlertTaskState;
}

export const alertInstancesTableColumns = [
  {
    field: 'instance',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.columns.instance',
      { defaultMessage: 'Instance' }
    ),
    sortable: false,
    truncateText: true,
    'data-test-subj': 'alertInstancesTableCell-instance',
  },
  {
    field: 'status',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.columns.status',
      { defaultMessage: 'Status' }
    ),
    sortable: false,
    'data-test-subj': 'alertInstancesTableCell-status',
  },
  {
    field: 'start',
    render: (value: Date | undefined, instance: AlertInstanceListItem) => {
      return value ? moment(value).format('D MMM YYYY @ HH:mm:ss') : '';
    },
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.columns.start',
      { defaultMessage: 'Start' }
    ),
    sortable: false,
    'data-test-subj': 'alertInstancesTableCell-start',
  },
  {
    field: 'duration',
    render: (value: number, instance: AlertInstanceListItem) => {
      return value ? durationAsString(moment.duration(value)) : '';
    },
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.columns.duration',
      { defaultMessage: 'Duration' }
    ),
    sortable: false,
    'data-test-subj': 'alertInstancesTableCell-duration',
  },
];

function durationAsString(duration: Duration): string {
  return [duration.hours(), duration.minutes(), duration.seconds()]
    .map(value => padLeft(`${value}`, 2, '0'))
    .join(':');
}

export function AlertInstances({
  alert: { mutedInstanceIds },
  alertState: { alertInstances = {} },
}: AlertInstancesProps) {
  return (
    <EuiBasicTable
      items={[
        ...Object.entries(alertInstances).map(([instanceId, instance]) =>
          alertInstanceToListItem(instanceId, instance)
        ),
        ...mutedInstanceIds.map(instanceId => alertInstanceToListItem(instanceId)),
      ]}
      columns={alertInstancesTableColumns}
      data-test-subj="alertInstancesList"
    />
  );
}

export interface AlertInstanceListItem {
  instance: string;
  status: string;
  start?: Date;
  duration: number;
  isMuted: boolean;
}

const ACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.status.active',
  { defaultMessage: 'Active' }
);

const INACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.status.active',
  { defaultMessage: 'Inactive' }
);

const durationSince = (start?: Date) => (start ? Date.now() - start.getTime() : 0);
export function alertInstanceToListItem(
  instanceId: string,
  instance?: RawAlertInstance
): AlertInstanceListItem {
  return {
    instance: instanceId,
    status: instance ? ACTIVE_LABEL : INACTIVE_LABEL,
    start: instance?.meta?.lastScheduledActions?.date,
    duration: durationSince(instance?.meta?.lastScheduledActions?.date),
    isMuted: instance ? false : true,
  };
}

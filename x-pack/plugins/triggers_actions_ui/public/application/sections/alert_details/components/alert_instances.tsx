/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import moment, { Duration } from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiHealth, EuiSpacer, EuiSwitch } from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { padStart, chunk } from 'lodash';
import { Alert, AlertStatus, AlertInstanceStatus, Pagination } from '../../../../types';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';

type AlertInstancesProps = {
  alert: Alert;
  readOnly: boolean;
  alertStatus: AlertStatus;
  requestRefresh: () => Promise<void>;
  durationEpoch?: number;
} & Pick<AlertApis, 'muteAlertInstance' | 'unmuteAlertInstance'>;

export const alertInstancesTableColumns = (
  onMuteAction: (instance: AlertInstanceListItem) => Promise<void>,
  readOnly: boolean
) => [
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
    render: (value: AlertInstanceListItemStatus, instance: AlertInstanceListItem) => {
      return <EuiHealth color={value.healthColor}>{value.label}</EuiHealth>;
    },
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
    align: CENTER_ALIGNMENT,
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
  {
    field: '',
    align: RIGHT_ALIGNMENT,
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.columns.mute',
      { defaultMessage: 'Mute' }
    ),
    render: (alertInstance: AlertInstanceListItem) => {
      return (
        <Fragment>
          <EuiSwitch
            label="mute"
            showLabel={false}
            compressed={true}
            checked={alertInstance.isMuted}
            disabled={readOnly}
            data-test-subj={`muteAlertInstanceButton_${alertInstance.instance}`}
            onChange={() => onMuteAction(alertInstance)}
          />
        </Fragment>
      );
    },
    sortable: false,
    'data-test-subj': 'alertInstancesTableCell-actions',
  },
];

function durationAsString(duration: Duration): string {
  return [duration.hours(), duration.minutes(), duration.seconds()]
    .map((value) => padStart(`${value}`, 2, '0'))
    .join(':');
}

export function AlertInstances({
  alert,
  readOnly,
  alertStatus,
  muteAlertInstance,
  unmuteAlertInstance,
  requestRefresh,
  durationEpoch = Date.now(),
}: AlertInstancesProps) {
  const [pagination, setPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });

  const alertInstances = Object.entries(alertStatus.instances).map(([instanceId, instance]) =>
    alertInstanceToListItem(durationEpoch, alert, instanceId, instance)
  );
  const pageOfAlertInstances = getPage(alertInstances, pagination);

  const onMuteAction = async (instance: AlertInstanceListItem) => {
    await (instance.isMuted
      ? unmuteAlertInstance(alert, instance.instance)
      : muteAlertInstance(alert, instance.instance));
    requestRefresh();
  };

  return (
    <Fragment>
      <EuiSpacer size="xl" />
      <input
        type="hidden"
        data-test-subj="alertInstancesDurationEpoch"
        name="alertInstancesDurationEpoch"
        value={durationEpoch}
      />
      <EuiBasicTable
        items={pageOfAlertInstances}
        pagination={{
          pageIndex: pagination.index,
          pageSize: pagination.size,
          totalItemCount: alertInstances.length,
        }}
        onChange={({ page: changedPage }: { page: Pagination }) => {
          setPagination(changedPage);
        }}
        rowProps={() => ({
          'data-test-subj': 'alert-instance-row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        columns={alertInstancesTableColumns(onMuteAction, readOnly)}
        data-test-subj="alertInstancesList"
      />
    </Fragment>
  );
}
export const AlertInstancesWithApi = withBulkAlertOperations(AlertInstances);

function getPage(items: any[], pagination: Pagination) {
  return chunk(items, pagination.size)[pagination.index] || [];
}

interface AlertInstanceListItemStatus {
  label: string;
  healthColor: string;
}
export interface AlertInstanceListItem {
  instance: string;
  status: AlertInstanceListItemStatus;
  start?: Date;
  duration: number;
  isMuted: boolean;
}

const ACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.status.active',
  { defaultMessage: 'Active' }
);

const INACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.status.inactive',
  { defaultMessage: 'OK' }
);

export function alertInstanceToListItem(
  durationEpoch: number,
  alert: Alert,
  instanceId: string,
  instance: AlertInstanceStatus
): AlertInstanceListItem {
  const isMuted = !!instance?.muted;
  const status =
    instance?.status === 'Active'
      ? { label: ACTIVE_LABEL, healthColor: 'primary' }
      : { label: INACTIVE_LABEL, healthColor: 'subdued' };
  const start = instance?.activeStartDate ? new Date(instance.activeStartDate) : undefined;
  const duration = start ? durationEpoch - start.valueOf() : 0;
  return {
    instance: instanceId,
    status,
    start,
    duration,
    isMuted,
  };
}

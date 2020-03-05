/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import moment, { Duration } from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiButtonToggle, EuiBadge, EuiHealth } from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { padLeft, difference, chunk } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { Alert, AlertTaskState, RawAlertInstance, Pagination } from '../../../../types';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';

type AlertInstancesProps = {
  alert: Alert;
  alertState: AlertTaskState;
  requestRefresh: () => Promise<void>;
} & Pick<AlertApis, 'muteAlertInstance' | 'unmuteAlertInstance'>;

export const alertInstancesTableColumns = (
  onMuteAction: (instance: AlertInstanceListItem) => Promise<void>
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
      'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.columns.actions',
      { defaultMessage: 'Actions' }
    ),
    render: (alertInstance: AlertInstanceListItem) => {
      return (
        <Fragment>
          {alertInstance.isMuted ? (
            <EuiBadge data-test-subj={`mutedAlertInstanceLabel_${alertInstance.instance}`}>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertDetails.alertInstances.mutedAlert"
                defaultMessage="Muted"
              />
            </EuiBadge>
          ) : (
            <Fragment />
          )}
          <EuiButtonToggle
            label={
              alertInstance.isMuted
                ? i18n.translate(
                    'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.actions.unmute',
                    { defaultMessage: 'Unmute' }
                  )
                : i18n.translate(
                    'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.actions.mute',
                    { defaultMessage: 'Mute' }
                  )
            }
            data-test-subj={`muteAlertInstanceButton_${alertInstance.instance}`}
            iconType={alertInstance.isMuted ? 'eyeClosed' : 'eye'}
            onChange={() => onMuteAction(alertInstance)}
            isSelected={alertInstance.isMuted}
            isEmpty
            isIconOnly
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
    .map(value => padLeft(`${value}`, 2, '0'))
    .join(':');
}

export function AlertInstances({
  alert,
  alertState: { alertInstances = {} },
  muteAlertInstance,
  unmuteAlertInstance,
  requestRefresh,
}: AlertInstancesProps) {
  const [pagination, setPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });

  const mergedAlertInstances = [
    ...Object.entries(alertInstances).map(([instanceId, instance]) =>
      alertInstanceToListItem(alert, instanceId, instance)
    ),
    ...difference(alert.mutedInstanceIds, Object.keys(alertInstances)).map(instanceId =>
      alertInstanceToListItem(alert, instanceId)
    ),
  ];
  const pageOfAlertInstances = getPage(mergedAlertInstances, pagination);

  const onMuteAction = async (instance: AlertInstanceListItem) => {
    await (instance.isMuted
      ? unmuteAlertInstance(alert, instance.instance)
      : muteAlertInstance(alert, instance.instance));
    requestRefresh();
  };

  return (
    <EuiBasicTable
      items={pageOfAlertInstances}
      pagination={{
        pageIndex: pagination.index,
        pageSize: pagination.size,
        totalItemCount: mergedAlertInstances.length,
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
      columns={alertInstancesTableColumns(onMuteAction)}
      data-test-subj="alertInstancesList"
    />
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
  { defaultMessage: 'Inactive' }
);

const durationSince = (start?: Date) => (start ? Date.now() - start.getTime() : 0);

export function alertInstanceToListItem(
  alert: Alert,
  instanceId: string,
  instance?: RawAlertInstance
): AlertInstanceListItem {
  const isMuted = alert.mutedInstanceIds.findIndex(muted => muted === instanceId) >= 0;
  return {
    instance: instanceId,
    status: instance
      ? { label: ACTIVE_LABEL, healthColor: 'primary' }
      : { label: INACTIVE_LABEL, healthColor: 'subdued' },
    start: instance?.meta?.lastScheduledActions?.date,
    duration: durationSince(instance?.meta?.lastScheduledActions?.date),
    isMuted,
  };
}

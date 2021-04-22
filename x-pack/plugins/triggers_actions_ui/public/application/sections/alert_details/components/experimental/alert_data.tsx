/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import moment, { Duration } from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiIconTip, EuiSpacer, EuiToolTip } from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { padStart, chunk } from 'lodash';
import { ActionGroup, AlertInstanceStatusValues } from '../../../../../../../alerting/common';
import {
  Alert,
  AlertInstanceStatus,
  AlertType,
  AlertTypeModel,
  Pagination,
} from '../../../../../types';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../../common/components/with_bulk_alert_api_operations';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../../constants';
import { AlertData, AlertDataItem } from '../../../../lib/alert_api';
import { useKibana } from '../../../../../common/lib/kibana';

interface AlertTableData extends AlertData {
  active: boolean;
  start: number;
}

type AlertDataTableProps = {
  alert: Alert;
  alertType: AlertType;
  readOnly: boolean;
  alertData: AlertData;
  requestRefresh: () => Promise<void>;
  durationEpoch?: number;
} & Pick<AlertApis, 'muteAlertInstance' | 'unmuteAlertInstance'>;

function durationAsString(duration: Duration): string {
  return [duration.hours(), duration.minutes(), duration.seconds()]
    .map((value) => padStart(`${value}`, 2, '0'))
    .join(':');
}

const columns = (alert: Alert, alertTypeModel: AlertTypeModel) => [
  {
    field: 'active',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertsTable.statusColumnDescription',
      {
        defaultMessage: 'Status',
      }
    ),
    align: 'center',
    render: (active: boolean) => {
      return active ? (
        <EuiIconTip
          content={i18n.translate(
            'xpack.triggersActionsUI.sections.alertDetails.alertsTable.statusActiveDescription',
            {
              defaultMessage: 'Active',
            }
          )}
          color="danger"
          type="alert"
        />
      ) : (
        <EuiIconTip
          content={i18n.translate(
            'xpack.triggersActionsUI.sections.alertDetails.alertsTable.statusRecoveredDescription',
            {
              defaultMessage: 'Recovered',
            }
          )}
          type="check"
        />
      );
    },
  },
  {
    field: 'id',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertsTable.alertIdColumnDescription',
      {
        defaultMessage: 'Alert ID',
      }
    ),
  },
  {
    field: 'start',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertsTable.triggeredColumnDescription',
      {
        defaultMessage: 'Triggered',
      }
    ),
    render: (start: number) => {
      const time = new Date(start).getTime();
      const momentTime = moment(time);
      const relativeTimeLabel = momentTime.fromNow();
      const absoluteTimeLabel = momentTime.format(`MMM D, YYYY, HH:mm:ss.SSS Z`);
      return (
        <EuiToolTip content={absoluteTimeLabel}>
          <>{relativeTimeLabel}</>
        </EuiToolTip>
      );
    },
  },
  {
    field: 'duration',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertsTable.durationColumnDescription',
      {
        defaultMessage: 'Duration',
      }
    ),
    render: (duration: number, item: AlertTableData) => {
      const { active } = item;
      return active || duration == null ? null : durationAsString(moment.duration(duration / 1000));
    },
  },
  {
    field: 'reason',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertsTable.reasonColumnDescription',
      {
        defaultMessage: 'Reason',
      }
    ),
    dataType: 'string',
    render: () => {
      return alertTypeModel && alertTypeModel.formatter
        ? alertTypeModel.formatter(alert.params)
        : 'Threshold condition met';
    },
  },
  // {
  //   field: '',
  //   align: RIGHT_ALIGNMENT,
  //   width: '60px',
  //   name: i18n.translate(
  //     'xpack.triggersActionsUI.sections.alertDetails.alertsTable.muteActionDescription',
  //     { defaultMessage: 'Mute' }
  //   ),
  //   render: (_, alert: AlertTableData) => {
  //     return (
  //       <Fragment>
  //         <EuiSwitch
  //           label="mute"
  //           showLabel={false}
  //           compressed={true}
  //           checked={alertInstance.isMuted}
  //           disabled={readOnly}
  //           data-test-subj={`muteAlertInstanceButton_${alertInstance.instance}`}
  //           onChange={() => onMuteAction(alertInstance)}
  //         />
  //       </Fragment>
  //     );
  //   },
  //   sortable: false,
  //   'data-test-subj': 'alertInstancesTableCell-actions',
  // },
];

export function AlertDataTable({
  alert,
  alertType,
  readOnly,
  alertData,
  muteAlertInstance,
  unmuteAlertInstance,
  requestRefresh,
  durationEpoch = Date.now(),
}: AlertDataTableProps) {
  const [pagination, setPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });
  const [alertTableData, setAlertTableData] = useState<any[]>([]);

  const { alertTypeRegistry } = useKibana().services;
  const alertTypeModel = alertTypeRegistry.get(alert.alertTypeId);
  useEffect(() => {
    if (alertData && alertData.alerts && alertData.alerts.length > 0) {
      setAlertTableData(
        alertData.alerts.map((data: AlertDataItem) => {
          // const ruleType = observabilityRuleRegistry.getTypeByRuleId(alert['rule.id']);
          // const formatted = {
          //   reason: alert['rule.name'],
          //   ...(ruleType?.format?.({ alert, formatters: { asDuration, asPercent } }) ?? {}),
          // };

          // const parsedLink = formatted.link ? parse(formatted.link, true) : undefined;

          return {
            ...data,
            // ...formatted,
            // link: parsedLink
            //   ? format({
            //       ...parsedLink,
            //       query: {
            //         ...parsedLink.query,
            //         rangeFrom,
            //         rangeTo,
            //       },
            //     })
            //   : undefined,
            active: data['event.action'] !== 'recovered',
            start: new Date(data['kibana.rac.alert.start']).getTime(),
            id: data['kibana.rac.alert.id'],
            duration: data['kibana.rac.alert.duration.us'],
          };
        })
      );
    } else {
      setAlertTableData([]);
    }
  }, [alertData]);

  // const alertInstances = Object.entries(alertInstanceSummary.instances)
  //   .map(([instanceId, instance]) =>
  //     alertInstanceToListItem(durationEpoch, alertType, instanceId, instance)
  //   )
  //   .sort((leftInstance, rightInstance) => leftInstance.sortPriority - rightInstance.sortPriority);

  // const pageOfAlertInstances = getPage(alertInstances, pagination);

  // const onMuteAction = async (instance: AlertInstanceListItem) => {
  //   await (instance.isMuted
  //     ? unmuteAlertInstance(alert, instance.instance)
  //     : muteAlertInstance(alert, instance.instance));
  //   requestRefresh();
  // };

  return (
    <Fragment>
      <EuiSpacer size="xl" />
      <EuiBasicTable
        columns={columns(alert, alertTypeModel)}
        tableLayout="auto"
        items={alertTableData}
        pagination={{ pageIndex: 0, pageSize: 0, totalItemCount: 0 }}
      />
      {/* <input
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
        tableLayout="fixed"
        className="alertInstancesList"
      /> */}
    </Fragment>
  );
}
export const AlertDataTableWithApi = withBulkAlertOperations(AlertDataTable);

function getPage(items: any[], pagination: Pagination) {
  return chunk(items, pagination.size)[pagination.index] || [];
}

interface AlertInstanceListItemStatus {
  label: string;
  healthColor: string;
  actionGroup?: string;
}
export interface AlertInstanceListItem {
  instance: string;
  status: AlertInstanceListItemStatus;
  start?: Date;
  duration: number;
  isMuted: boolean;
  sortPriority: number;
}

const ACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.status.active',
  { defaultMessage: 'Active' }
);

const INACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertInstancesList.status.inactive',
  { defaultMessage: 'OK' }
);

function getActionGroupName(alertType: AlertType, actionGroupId?: string): string | undefined {
  actionGroupId = actionGroupId || alertType.defaultActionGroupId;
  const actionGroup = alertType?.actionGroups?.find(
    (group: ActionGroup<string>) => group.id === actionGroupId
  );
  return actionGroup?.name;
}

export function alertInstanceToListItem(
  durationEpoch: number,
  alertType: AlertType,
  instanceId: string,
  instance: AlertInstanceStatus
): AlertInstanceListItem {
  const isMuted = !!instance?.muted;
  const status =
    instance?.status === 'Active'
      ? {
          label: ACTIVE_LABEL,
          actionGroup: getActionGroupName(alertType, instance?.actionGroupId),
          healthColor: 'primary',
        }
      : { label: INACTIVE_LABEL, healthColor: 'subdued' };
  const start = instance?.activeStartDate ? new Date(instance.activeStartDate) : undefined;
  const duration = start ? durationEpoch - start.valueOf() : 0;
  const sortPriority = getSortPriorityByStatus(instance?.status);
  return {
    instance: instanceId,
    status,
    start,
    duration,
    isMuted,
    sortPriority,
  };
}

function getSortPriorityByStatus(status?: AlertInstanceStatusValues): number {
  switch (status) {
    case 'Active':
      return 0;
    case 'OK':
      return 1;
  }
  return 2;
}

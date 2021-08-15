/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CriteriaWithPagination, EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_ID, ALERT_RULE_NAME, TIMESTAMP } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { useUiSetting } from '../../../../../../../src/plugins/kibana_react/public';

import type { ControlColumnProps, RowRenderer, TimelineItem } from '../../../../common';
import { RuleName } from '../../rule_name';

interface EventRenderedViewProps {
  events: TimelineItem[];
  leadingControlColumns: ControlColumnProps[];
  onChangePage: (newActivePage: number) => void;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  rowRenderers: RowRenderer[];
  totalItemCount: number;
}
export const PreferenceFormattedDate = React.memo<{ value: Date }>(
  /* eslint-disable-next-line react-hooks/rules-of-hooks */
  ({ value }) => {
    const tz = useUiSetting<string>('dateFormat:tz');
    const dateFormat = useUiSetting<string>('dateFormat');
    return (<>{moment.tz(value, tz).format(dateFormat)}</>);
}

const EventRenderedViewComponent = ({
  events,
  leadingControlColumns,
  onChangePage,
  pageIndex,
  pageSize,
  pageSizeOptions,
  rowRenderers,
  totalItemCount,
}: EventRenderedViewProps) => {
  const columns = useMemo(
    () => [
      {
        field: 'actions',
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.actions.column', {
          defaultMessage: 'Actions',
        }),
        truncateText: false,
        hideForMobile: false,
      },
      {
        field: 'ecs.@timestamp',
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.timestamp.column', {
          defaultMessage: 'Timestamp',
        }),
        truncateText: false,
        hideForMobile: false,
        // eslint-disable-next-line react/display-name
        render: (name, item) => {
          console.log(name, item);
          const timestamp = get(item, `ecs.${TIMESTAMP}`);
          return <PreferenceFormattedDate value={timestamp} />;
        },
      },
      {
        field: `ecs.${ALERT_RULE_NAME}`,
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.rule.column', {
          defaultMessage: 'Rule',
        }),
        truncateText: false,
        hideForMobile: false,
        // eslint-disable-next-line react/display-name
        render: (name, item) => {
          console.log(name, item);
          const ruleName = get(item, ALERT_RULE_NAME);
          const ruleId = get(item, ALERT_RULE_ID);
          return <RuleName name={ruleName} id={ruleId} />;
        },
      },
      {
        field: 'eventSummary',
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.eventSummary.column', {
          defaultMessage: 'Event Summary',
        }),
        render: () => null,
      },
    ],
    []
  );

  const handleTableChange = useCallback(
    (pageChange: CriteriaWithPagination<TimelineItem>) => {
      onChangePage(pageChange.page.index);
    },
    [onChangePage]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [3, 5, 8],
    hidePerPageOptions: false,
  };
  console.log('EuiBasicTable');
  return (
    <EuiBasicTable
      items={events}
      columns={columns}
      pagination={pagination}
      onChange={handleTableChange}
    />
  );
};

export const EventRenderedView = React.memo(EventRenderedViewComponent);

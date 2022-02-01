/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiHealth } from '@elastic/eui';

import React from 'react';
import { RuleExecutionEvent } from '../../../../../../../common/detection_engine/schemas/common';
import {
  getEmptyTagValue,
  getEmptyValue,
  getOrEmptyTagFromValue,
} from '../../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../../common/components/formatted_date';
import { getStatusColor } from '../../../../../components/rules/rule_execution_status/utils';

import * as i18n from '../translations';

const ONE_SECOND_AS_NANOSECONDS = 1000000000;

export const EXECUTION_LOG_COLUMNS: Array<EuiBasicTableColumn<RuleExecutionEvent>> = [
  {
    name: i18n.COLUMN_STATUS,
    field: 'kibana.alert.rule.execution.status',
    render: (value: string, data) =>
      value ? <EuiHealth color={getStatusColor(value)}>{value}</EuiHealth> : getEmptyTagValue(),
    sortable: true,
    truncateText: false,
    width: '10%',
  },
  {
    field: '@timestamp',
    name: i18n.COLUMN_TIMESTAMP,
    render: (value: string) => <FormattedDate value={value} fieldName="date" />,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'message',
    name: i18n.COLUMN_MESSAGE,
    render: (value: string) => <>{value}</>,
    sortable: true,
    truncateText: false,
    width: '35%',
  },
  {
    field: 'event.duration',
    name: i18n.COLUMN_DURATION,
    render: (value: number) => <>{value ? value / ONE_SECOND_AS_NANOSECONDS : getEmptyValue()}</>,
    sortable: true,
    truncateText: false,
    width: '5%',
  },
  {
    field: 'kibana.alert.rule.execution.metrics.total_alerts',
    name: i18n.COLUMN_TOTAL_ALERTS,
    render: (value: number) => getOrEmptyTagFromValue(value),
    sortable: true,
    truncateText: false,
    width: '5%',
  },
  {
    field: 'kibana.alert.rule.execution.metrics.total_hits',
    name: i18n.COLUMN_TOTAL_HITS,
    render: (value: number) => getOrEmptyTagFromValue(value),
    sortable: true,
    truncateText: false,
    width: '5%',
  },
  {
    field: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
    name: i18n.COLUMN_GAP_DURATION,
    render: (value: number) => getOrEmptyTagFromValue(value),
    sortable: true,
    truncateText: false,
    width: '6%',
  },
  {
    field: 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
    name: i18n.COLUMN_INDEX_DURATION,
    render: (value: number) => getOrEmptyTagFromValue(value),
    sortable: true,
    truncateText: false,
    width: '7%',
  },
  {
    field: 'kibana.alert.rule.execution.metrics.total_search_duration_ms',
    name: i18n.COLUMN_SEARCH_DURATION,
    render: (value: number) => getOrEmptyTagFromValue(value),
    sortable: true,
    truncateText: false,
    width: '8%',
  },
  {
    field: 'kibana.task.schedule_delay',
    name: 'Scheduling Delay (s)',
    render: (value: number) => <>{value ? value / ONE_SECOND_AS_NANOSECONDS : getEmptyValue()}</>,
    sortable: true,
    truncateText: false,
    width: '8%',
  },
];

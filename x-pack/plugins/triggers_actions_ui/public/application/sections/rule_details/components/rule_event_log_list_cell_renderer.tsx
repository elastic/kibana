/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { EcsEventOutcome } from '@kbn/core/server';
import { RuleEventLogListStatus } from './rule_event_log_list_status';
import { RuleDurationFormat } from '../../rules_list/components/rule_duration_format';
import {
  RULE_EXECUTION_LOG_COLUMN_IDS,
  RULE_EXECUTION_LOG_DURATION_COLUMNS,
} from '../../../constants';

export const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

export type ColumnId = typeof RULE_EXECUTION_LOG_COLUMN_IDS[number];

interface RuleEventLogListCellRendererProps {
  columnId: ColumnId;
  value?: string;
  dateFormat?: string;
}

export const RuleEventLogListCellRenderer = (props: RuleEventLogListCellRendererProps) => {
  const { columnId, value, dateFormat = DEFAULT_DATE_FORMAT } = props;

  if (typeof value === 'undefined') {
    return null;
  }

  if (columnId === 'status') {
    return <RuleEventLogListStatus status={value as EcsEventOutcome} />;
  }

  if (columnId === 'timestamp') {
    return <>{moment(value).format(dateFormat)}</>;
  }

  if (RULE_EXECUTION_LOG_DURATION_COLUMNS.includes(columnId)) {
    return <RuleDurationFormat duration={parseInt(value, 10)} />;
  }

  return <>{value}</>;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EcsEventOutcome } from 'kibana/server';
import { RuleEventLogListStatus } from './rule_event_log_list_status';
import { RuleDurationFormat } from '../../../sections/rules_list/components/rule_duration_format';

const DURATION_COLUMNS = [
  'execution_duration',
  'total_search_duration',
  'es_search_duration',
  'schedule_delay',
];

interface RuleEventLogListCellRendererProps {
  columnId: string;
  value?: string;
  dateFormat?: string;
}

export const RuleEventLogListCellRenderer = (props: RuleEventLogListCellRendererProps) => {
  const { columnId, value, dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS' } = props;

  if (typeof value === 'undefined') {
    return null;
  }

  if (columnId === 'status') {
    return <RuleEventLogListStatus status={value as EcsEventOutcome} />;
  }

  if (columnId === 'timestamp') {
    return <>{moment(value).format(dateFormat)}</>;
  }

  if (DURATION_COLUMNS.includes(columnId)) {
    return <RuleDurationFormat duration={parseInt(value, 10)} />;
  }

  return <>{value}</>;
};

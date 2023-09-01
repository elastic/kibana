/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiScreenReaderOnly, RIGHT_ALIGNMENT } from '@elastic/eui';

import type {
  LogLevel,
  RuleExecutionEvent,
  RuleExecutionEventType,
} from '../../../../../common/api/detection_engine/rule_monitoring';

import { FormattedDate } from '../../../../common/components/formatted_date';
import { EventTypeIndicator } from '../basic/indicators/event_type_indicator';
import { LogLevelIndicator } from '../basic/indicators/log_level_indicator';
import { TruncatedText } from '../basic/text/truncated_text';

import * as i18n from './translations';

type TableColumn = EuiBasicTableColumn<RuleExecutionEvent>;

interface UseColumnsArgs {
  toggleRowExpanded: (item: RuleExecutionEvent) => void;
  isRowExpanded: (item: RuleExecutionEvent) => boolean;
}

export const useColumns = (args: UseColumnsArgs): TableColumn[] => {
  const { toggleRowExpanded, isRowExpanded } = args;

  return useMemo(() => {
    return [
      timestampColumn,
      logLevelColumn,
      eventTypeColumn,
      messageColumn,
      expanderColumn({ toggleRowExpanded, isRowExpanded }),
    ];
  }, [toggleRowExpanded, isRowExpanded]);
};

const timestampColumn: TableColumn = {
  field: 'timestamp',
  name: i18n.COLUMN_TIMESTAMP,
  render: (value: string) => <FormattedDate value={value} fieldName="timestamp" />,
  sortable: true,
  truncateText: false,
  width: '20%',
};

const logLevelColumn: TableColumn = {
  field: 'level',
  name: i18n.COLUMN_LOG_LEVEL,
  render: (value: LogLevel) => <LogLevelIndicator logLevel={value} />,
  sortable: false,
  truncateText: false,
  width: '8%',
};

const eventTypeColumn: TableColumn = {
  field: 'type',
  name: i18n.COLUMN_EVENT_TYPE,
  render: (value: RuleExecutionEventType) => <EventTypeIndicator type={value} />,
  sortable: false,
  truncateText: false,
  width: '8%',
};

const messageColumn: TableColumn = {
  field: 'message',
  name: i18n.COLUMN_MESSAGE,
  render: (value: string) => <TruncatedText text={value} />,
  sortable: false,
  truncateText: true,
  width: '64%',
};

const expanderColumn = ({ toggleRowExpanded, isRowExpanded }: UseColumnsArgs): TableColumn => {
  return {
    align: RIGHT_ALIGNMENT,
    width: '40px',
    isExpander: true,
    name: (
      <EuiScreenReaderOnly>
        <span>{'Expand rows'}</span>
      </EuiScreenReaderOnly>
    ),
    render: (item: RuleExecutionEvent) => (
      <EuiButtonIcon
        onClick={() => toggleRowExpanded(item)}
        aria-label={isRowExpanded(item) ? 'Collapse' : 'Expand'}
        iconType={isRowExpanded(item) ? 'arrowUp' : 'arrowDown'}
      />
    ),
  };
};

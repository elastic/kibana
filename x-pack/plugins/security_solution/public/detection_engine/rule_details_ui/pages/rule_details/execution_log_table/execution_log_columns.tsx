/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiLink,
  EuiText,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  RuleExecutionResult,
  RuleExecutionStatus,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

import { getEmptyValue } from '../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import {
  RULE_EXECUTION_TYPE_BACKFILL,
  RULE_EXECUTION_TYPE_STANDARD,
} from '../../../../../common/translations';
import { ExecutionStatusIndicator } from '../../../../rule_monitoring';
import { PopoverTooltip } from '../../../../rule_management_ui/components/rules_table/popover_tooltip';
import { TableHeaderTooltipCell } from '../../../../rule_management_ui/components/rules_table/table_header_tooltip_cell';
import { RuleDurationFormat } from './rule_duration_format';

import * as i18n from './translations';

type TableColumn = EuiBasicTableColumn<RuleExecutionResult>;

interface UseColumnsArgs {
  toggleRowExpanded: (item: RuleExecutionResult) => void;
  isRowExpanded: (item: RuleExecutionResult) => boolean;
}

export const expanderColumn = ({
  toggleRowExpanded,
  isRowExpanded,
}: UseColumnsArgs): TableColumn => {
  return {
    align: RIGHT_ALIGNMENT,
    width: '40px',
    isExpander: true,
    name: (
      <EuiScreenReaderOnly>
        <span>{i18n.EXPAND_ROW}</span>
      </EuiScreenReaderOnly>
    ),
    render: (item: RuleExecutionResult) =>
      item.security_status === 'succeeded' ? null : (
        <EuiButtonIcon
          onClick={() => toggleRowExpanded(item)}
          aria-label={isRowExpanded(item) ? i18n.COLLAPSE : i18n.EXPAND}
          iconType={isRowExpanded(item) ? 'arrowUp' : 'arrowDown'}
        />
      ),
  };
};

export const EXECUTION_LOG_COLUMNS: Array<EuiBasicTableColumn<RuleExecutionResult>> = [
  {
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_STATUS}
        tooltipContent={i18n.COLUMN_STATUS_TOOLTIP}
      />
    ),
    field: 'security_status',
    render: (value: RuleExecutionStatus) => (
      <ExecutionStatusIndicator status={value} showTooltip={true} />
    ),
    sortable: false,
    truncateText: false,
    width: '10%',
  },
  {
    name: i18n.COLUMN_TYPE,
    field: 'type',
    sortable: false,
    width: '10%',
    render: (value, record) => {
      return (
        <EuiText size="s">
          {record.backfill ? RULE_EXECUTION_TYPE_BACKFILL : RULE_EXECUTION_TYPE_STANDARD}
        </EuiText>
      );
    },
  },
  {
    field: 'timestamp',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_TIMESTAMP}
        tooltipContent={i18n.COLUMN_TIMESTAMP_TOOLTIP}
      />
    ),
    render: (value: string) => <FormattedDate value={value} fieldName="timestamp" />,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'duration_ms',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_DURATION}
        tooltipContent={i18n.COLUMN_DURATION_TOOLTIP}
      />
    ),
    render: (value: number) => (
      <>{value ? <RuleDurationFormat duration={value} /> : getEmptyValue()}</>
    ),
    sortable: true,
    truncateText: false,
    width: '10%',
  },
];

export const getMessageColumn = (width: string) => ({
  field: 'security_message',
  name: (
    <TableHeaderTooltipCell
      title={i18n.COLUMN_MESSAGE}
      tooltipContent={i18n.COLUMN_MESSAGE_TOOLTIP}
    />
  ),
  render: (value: string, record: RuleExecutionResult) => {
    if (record.security_status === 'succeeded') {
      return value;
    }

    return (
      <div
        css={css`
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        `}
      >
        {value}
      </div>
    );
  },
  sortable: false,
  width,
});

export const getSourceEventTimeRangeColumns = () => [
  {
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_SOURCE_EVENT_TIME_RANGE}
        tooltipContent={i18n.COLUMN_SOURCE_EVENT_TIME_RANGE_TOOLTIP}
      />
    ),
    field: 'backfill',
    render: (backfill: { to: string; from: string }) => {
      return backfill ? (
        <div>
          <div>
            <FormattedDate value={backfill.to} fieldName="backfill.to" />
          </div>
          <EuiText textAlign="center">{'-'}</EuiText>
          <div>
            <FormattedDate value={backfill.from} fieldName="backfill.from" />
          </div>
        </div>
      ) : (
        getEmptyValue()
      );
    },
    width: '20%',
  },
];

export const getExecutionLogMetricsColumns = (
  docLinks: DocLinksStart
): Array<EuiBasicTableColumn<RuleExecutionResult>> => [
  {
    field: 'gap_duration_s',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_GAP_DURATION}
        customTooltip={
          <div style={{ maxWidth: '20px' }}>
            <PopoverTooltip columnName={i18n.COLUMN_GAP_DURATION}>
              <EuiText size={'s'} style={{ width: 350 }}>
                <p>
                  <FormattedMessage
                    defaultMessage="Duration of gap in Rule execution (hh:mm:ss:SSS). Adjust Rule look-back or {seeDocs} for mitigating gaps."
                    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.gapDurationColumnTooltip"
                    values={{
                      seeDocs: (
                        <EuiLink href={`${docLinks.links.siem.troubleshootGaps}`} target="_blank">
                          {i18n.COLUMN_GAP_TOOLTIP_SEE_DOCUMENTATION}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </PopoverTooltip>
          </div>
        }
      />
    ),
    render: (value: number) => (
      <>{value ? <RuleDurationFormat duration={value} isSeconds={true} /> : getEmptyValue()}</>
    ),
    sortable: true,
    truncateText: false,
    width: '10%',
  },
  {
    field: 'indexing_duration_ms',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_INDEX_DURATION}
        tooltipContent={i18n.COLUMN_INDEX_DURATION_TOOLTIP}
      />
    ),
    render: (value: number) => (
      <>{value ? <RuleDurationFormat duration={value} /> : getEmptyValue()}</>
    ),
    sortable: true,
    truncateText: false,
    width: '10%',
  },
  {
    field: 'search_duration_ms',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_SEARCH_DURATION}
        tooltipContent={i18n.COLUMN_SEARCH_DURATION_TOOLTIP}
      />
    ),
    render: (value: number) => (
      <>{value ? <RuleDurationFormat duration={value} /> : getEmptyValue()}</>
    ),
    sortable: true,
    truncateText: false,
    width: '10%',
  },
  {
    field: 'schedule_delay_ms',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_SCHEDULING_DELAY}
        tooltipContent={i18n.COLUMN_SCHEDULING_DELAY_TOOLTIP}
      />
    ),
    render: (value: number) => (
      <>{value ? <RuleDurationFormat duration={value} /> : getEmptyValue()}</>
    ),
    sortable: true,
    truncateText: false,
    width: '10%',
  },
];

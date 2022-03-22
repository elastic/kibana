/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiHealth, EuiLink, EuiText } from '@elastic/eui';
import { capitalize } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from 'kibana/public';
import React from 'react';
import {
  AggregateRuleExecutionEvent,
  RuleExecutionStatus,
} from '../../../../../../../common/detection_engine/schemas/common';
import { getEmptyTagValue, getEmptyValue } from '../../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../../common/components/formatted_date';
import { getStatusColor } from '../../../../../components/rules/rule_execution_status/utils';
import { PopoverTooltip } from '../../all/popover_tooltip';
import { TableHeaderTooltipCell } from '../../all/table_header_tooltip_cell';

import * as i18n from './translations';
import { RuleDurationFormat } from './rule_duration_format';

export const EXECUTION_LOG_COLUMNS: Array<EuiBasicTableColumn<AggregateRuleExecutionEvent>> = [
  {
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_STATUS}
        tooltipContent={i18n.COLUMN_STATUS_TOOLTIP}
      />
    ),
    field: 'security_status',
    render: (value: RuleExecutionStatus, data) =>
      value ? (
        <EuiHealth color={getStatusColor(value)}>{capitalize(value)}</EuiHealth>
      ) : (
        getEmptyTagValue()
      ),
    sortable: false,
    truncateText: false,
    width: '10%',
  },
  {
    field: 'timestamp',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_TIMESTAMP}
        tooltipContent={i18n.COLUMN_TIMESTAMP_TOOLTIP}
      />
    ),
    render: (value: string) => <FormattedDate value={value} fieldName="date" />,
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
  {
    field: 'security_message',
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_MESSAGE}
        tooltipContent={i18n.COLUMN_MESSAGE_TOOLTIP}
      />
    ),
    render: (value: string) => <>{value}</>,
    sortable: false,
    truncateText: false,
    width: '35%',
  },
];

export const GET_EXECUTION_LOG_METRICS_COLUMNS = (
  docLinks: DocLinksStart
): Array<EuiBasicTableColumn<AggregateRuleExecutionEvent>> => [
  {
    field: 'gap_duration_ms',
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
      <>{value ? <RuleDurationFormat duration={value} isMillis={true} /> : getEmptyValue()}</>
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

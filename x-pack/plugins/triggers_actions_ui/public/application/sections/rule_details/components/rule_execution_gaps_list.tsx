/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiBasicTable, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { RuleDurationFormat } from '../../rules_list/components/rule_duration_format';
import { scheduleBackfill } from '../../../lib/rule_api/schedule_backfill';

export interface GapItem {
  _id: string;
  start: string;
  end: string;
  duration: number;
  rule_id: string;
}
interface RuleExecutionGapsListProps {
  ruleId: string;
  items: GapItem[];
}

const getRowProps = () => ({
  'data-test-subj': 'alert-row',
});

const getCellProps = () => ({
  'data-test-subj': 'cell',
});

export const RuleExecutionGapsList = (props: RuleExecutionGapsListProps) => {
  const { items, ruleId } = props;
  const { http } = useKibana().services;
  const onScheduleBackfillClick = useCallback(
    async (gap: GapItem) => {
      await scheduleBackfill({
        http,
        ruleId,
        docId: gap._id,
        gap: { gapStart: gap.start, gapEnd: gap.end, gapDuration: gap.duration },
      });
    },
    [http, ruleId]
  );

  const executionGapsTableColumns = useMemo(
    () => [
      {
        field: 'start',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.executionGapsList.columns.start',
          {
            defaultMessage: 'Gap Start',
          }
        ),
        sortable: false,
        truncateText: true,
        width: '25%',
        'data-test-subj': 'executionGapsTableCell-start',
        render: (value: string) => {
          return <span>{value}</span>;
        },
      },
      {
        field: 'end',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.executionGapsList.columns.end',
          {
            defaultMessage: 'Gap End',
          }
        ),
        width: '25%',
        render: (value: string) => {
          return <span>{value}</span>;
        },
        sortable: false,
        'data-test-subj': 'executionGapsTableCell-end',
      },
      {
        field: 'duration',
        width: '190px',
        render: (value: number) => {
          return <RuleDurationFormat duration={value} />;
        },
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.executionGapsList.columns.duration',
          {
            defaultMessage: 'Gap Duration',
          }
        ),
        sortable: false,
        'data-test-subj': 'executionGapsTableCell-duration',
      },
      {
        field: '',
        align: 'right' as const,
        width: '60px',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.executionGapsList.columns.schedule',
          {
            defaultMessage: 'Schedule backfill',
          }
        ),
        render: (gap: GapItem) => {
          return (
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
              <EuiFlexItem grow={false} data-test-subj="ruleExecutionGapSchedule">
                <EuiButtonIcon
                  color={'primary'}
                  title={i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleDetails.executionGapsList.columns.scheduleButtonTooltip',
                    { defaultMessage: 'Schedule Backfill' }
                  )}
                  className="ruleExecutionGapListItem__schedule"
                  data-test-subj="scheduleBackfillHoverButton"
                  onClick={async () => {
                    await onScheduleBackfillClick(gap);
                  }}
                  iconType={'timeslider'}
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleDetails.executionGapsList.columns.scheduleAriaLabel',
                    { defaultMessage: 'Schedule Backfill' }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        sortable: false,
        'data-test-subj': 'executionGapsTableCell-schedule',
      },
    ],
    [onScheduleBackfillClick]
  );

  return (
    <EuiBasicTable<GapItem>
      items={items}
      rowProps={getRowProps}
      cellProps={getCellProps}
      columns={executionGapsTableColumns}
      data-test-subj="executionGapsList"
      tableLayout="fixed"
      className="executionGapsList"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleExecutionGapsList as default };

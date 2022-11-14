/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ComplianceDashboardData, GroupedFindingsEvaluation } from '../../../../common/types';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';

export interface RisksTableProps {
  data: ComplianceDashboardData['groupedFindingsEvaluation'];
  maxItems: number;
  onCellClick: (name: string) => void;
  onViewAllClick: () => void;
  compact?: boolean;
}

export const getTopRisks = (
  groupedFindingsEvaluation: ComplianceDashboardData['groupedFindingsEvaluation'],
  maxItems: number
) => {
  const filtered = groupedFindingsEvaluation.filter((x) => x.totalFailed > 0);
  const sorted = filtered.slice().sort((first, second) => second.totalFailed - first.totalFailed);

  return sorted.slice(0, maxItems);
};

export const RisksTable = ({
  data: resourcesTypes,
  maxItems,
  onCellClick,
  onViewAllClick,
  compact,
}: RisksTableProps) => {
  const columns: Array<EuiBasicTableColumn<GroupedFindingsEvaluation>> = useMemo(
    () => [
      {
        field: 'name',
        truncateText: true,
        name: compact
          ? ''
          : i18n.translate('xpack.csp.dashboard.risksTable.cisSectionColumnLabel', {
              defaultMessage: 'CIS Section',
            }),
        render: (name: GroupedFindingsEvaluation['name']) => (
          <EuiLink onClick={() => onCellClick(name)} className="eui-textTruncate" color="text">
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'totalFailed',
        name: compact
          ? ''
          : i18n.translate('xpack.csp.dashboard.risksTable.findingsColumnLabel', {
              defaultMessage: 'Findings',
            }),
        render: (
          totalFailed: GroupedFindingsEvaluation['totalFailed'],
          resource: GroupedFindingsEvaluation
        ) => (
          <>
            <EuiText size="s" color="danger">
              <CompactFormattedNumber number={resource.totalFailed} />
            </EuiText>
            <EuiText size="s">
              {'/'}
              <CompactFormattedNumber number={resource.totalFindings} />
            </EuiText>
          </>
        ),
      },
    ],
    [compact, onCellClick]
  );

  const items = useMemo(() => getTopRisks(resourcesTypes, maxItems), [resourcesTypes, maxItems]);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="none">
      <EuiFlexItem>
        <EuiBasicTable<GroupedFindingsEvaluation>
          rowHeader="name"
          items={items}
          columns={columns}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div>
          <EuiButtonEmpty onClick={onViewAllClick} iconType="search">
            <FormattedMessage
              id="xpack.csp.dashboard.risksTable.viewAllButtonTitle"
              defaultMessage="View all failed findings"
            />
          </EuiButtonEmpty>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ComplianceScoreBar } from '../../../components/compliance_score_bar';
import { ComplianceDashboardData, GroupedFindingsEvaluation } from '../../../../common/types';

export interface RisksTableProps {
  data: ComplianceDashboardData['groupedFindingsEvaluation'];
  maxItems: number;
  onCellClick: (name: string) => void;
  onViewAllClick: () => void;
  viewAllButtonTitle: string;
  compact?: boolean;
}

export const getTopRisks = (
  groupedFindingsEvaluation: ComplianceDashboardData['groupedFindingsEvaluation'],
  maxItems: number
) => {
  const sorted = groupedFindingsEvaluation
    .slice()
    .sort((first, second) => first.postureScore - second.postureScore);

  return sorted.slice(0, maxItems);
};

export const RisksTable = ({
  data: cisSectionsEvaluations,
  maxItems,
  onCellClick,
  onViewAllClick,
  viewAllButtonTitle,
  compact,
}: RisksTableProps) => {
  const { euiTheme } = useEuiTheme();

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
        field: 'postureScore',
        width: '115px',
        name: compact
          ? ''
          : i18n.translate('xpack.csp.dashboard.risksTable.complianceColumnLabel', {
              defaultMessage: 'Compliance',
            }),
        render: (postureScore: GroupedFindingsEvaluation['postureScore'], data) => (
          <ComplianceScoreBar totalPassed={data.totalPassed} totalFailed={data.totalFailed} />
        ),
      },
    ],
    [
      compact,
      euiTheme.border.radius.medium,
      euiTheme.font.weight.bold,
      euiTheme.size.s,
      euiTheme.size.xs,
      onCellClick,
    ]
  );

  const sortedByComplianceScore = getTopRisks(cisSectionsEvaluations, maxItems);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="none">
      <EuiFlexItem>
        <EuiInMemoryTable<GroupedFindingsEvaluation>
          items={sortedByComplianceScore}
          columns={columns}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div>
          <EuiButtonEmpty onClick={onViewAllClick} iconType="search">
            {viewAllButtonTitle}
          </EuiButtonEmpty>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

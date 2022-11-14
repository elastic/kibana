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
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { statusColors } from '../../../common/constants';
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
  const filtered = groupedFindingsEvaluation.filter((x) => x.postureScore > 0);
  const sorted = filtered.slice().sort((first, second) => first.postureScore - second.postureScore);

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
          <EuiFlexGroup
            gutterSize="none"
            alignItems="center"
            justifyContent="flexEnd"
            style={{ gap: euiThemeVars.gutterTypes.gutterSmall }}
          >
            <EuiFlexItem
              css={`
                // controls the coloring for the unfilled part of the progress element
                progress[value]::-webkit-progress-bar {
                  background-color: ${statusColors.success};
                }
              `}
            >
              <EuiProgress
                value={data.totalFailed}
                max={data.totalFailed + data.totalPassed}
                color={statusColors.danger}
                size="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                style={{ fontWeight: euiThemeVars.euiFontWeightBold }}
              >{`${postureScore.toFixed(0)}%`}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ],
    [compact, onCellClick]
  );

  const descByComplianceScore = getTopRisks(cisSectionsEvaluations, maxItems);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="none">
      <EuiFlexItem>
        <EuiInMemoryTable<GroupedFindingsEvaluation>
          items={descByComplianceScore}
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

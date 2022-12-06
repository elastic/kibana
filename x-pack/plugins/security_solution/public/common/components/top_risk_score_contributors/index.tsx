/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiInMemoryTable } from '@elastic/eui';

import { HeaderSection } from '../header_section';
import { InspectButton, InspectButtonContainer } from '../inspect';
import * as i18n from './translations';

import type { RuleRisk } from '../../../../common/search_strategy';

import { RuleLink } from '../../../detection_engine/rule_management_ui/components/rules_table/use_columns';

export interface TopRiskScoreContributorsProps {
  loading: boolean;
  rules?: RuleRisk[];
  queryId: string;
  toggleStatus: boolean;
  toggleQuery?: (status: boolean) => void;
}
interface TableItem {
  rank: number;
  name: string;
  id: string;
}

const columns: Array<EuiTableFieldDataColumnType<TableItem>> = [
  {
    name: i18n.RANK_TITLE,
    field: 'rank',
    width: '45px',
    align: 'right',
  },
  {
    name: i18n.RULE_NAME_TITLE,
    field: 'name',
    sortable: true,
    truncateText: true,
    render: (value: TableItem['name'], { id }: TableItem) =>
      id ? <RuleLink id={id} name={value} /> : value,
  },
];

const PAGE_SIZE = 5;

const TopRiskScoreContributorsComponent: React.FC<TopRiskScoreContributorsProps> = ({
  rules = [],
  loading,
  queryId,
  toggleStatus,
  toggleQuery,
}) => {
  const items = useMemo(() => {
    return rules
      ?.sort((a, b) => b.rule_risk - a.rule_risk)
      .map(({ rule_name: name, rule_id: id }, i) => ({ rank: i + 1, name, id }));
  }, [rules]);

  const tablePagination = useMemo(
    () => ({
      showPerPageOptions: false,
      pageSize: PAGE_SIZE,
      totalItemCount: items.length,
    }),
    [items.length]
  );

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="topRiskScoreContributors">
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem grow={1}>
            <HeaderSection
              title={i18n.TOP_RISK_SCORE_CONTRIBUTORS}
              hideSubtitle
              toggleQuery={toggleQuery}
              toggleStatus={toggleStatus}
            />
          </EuiFlexItem>
          {toggleStatus && (
            <EuiFlexItem grow={false}>
              <InspectButton queryId={queryId} title={i18n.TOP_RISK_SCORE_CONTRIBUTORS} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {toggleStatus && (
          <EuiFlexGroup
            data-test-subj="topRiskScoreContributors-table"
            gutterSize="none"
            direction="column"
          >
            <EuiFlexItem grow={1}>
              <EuiInMemoryTable
                items={items}
                columns={columns}
                pagination={tablePagination}
                loading={loading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

export const TopRiskScoreContributors = React.memo(TopRiskScoreContributorsComponent);
TopRiskScoreContributors.displayName = 'TopRiskScoreContributors';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiInMemoryTable,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';

import { HeaderSection } from '../../../common/components/header_section';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import * as i18n from './translations';
import { Direction } from '../../../../../timelines/common';

import { buildHostNamesFilter, RiskScoreFields } from '../../../../common/search_strategy';

import { useQueryInspector } from '../../../common/components/page/manage_query';
import { HostsComponentsQueryProps } from '../../pages/navigation/types';

import { RuleLink } from '../../../detections/pages/detection_engine/rules/all/use_columns';
import { HostRiskScoreQueryId, useHostRiskScore } from '../../../risk_score/containers';
import { useQueryToggle } from '../../../common/containers/query_toggle';

export interface TopHostScoreContributorsProps
  extends Pick<HostsComponentsQueryProps, 'setQuery' | 'deleteQuery'> {
  hostName: string;
  from: string;
  to: string;
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
const QUERY_ID = HostRiskScoreQueryId.TOP_HOST_SCORE_CONTRIBUTORS;

const TopHostScoreContributorsComponent: React.FC<TopHostScoreContributorsProps> = ({
  hostName,
  from,
  to,
  setQuery,
  deleteQuery,
}) => {
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const sort = useMemo(() => ({ field: RiskScoreFields.timestamp, direction: Direction.desc }), []);

  const { toggleStatus, setToggleStatus } = useQueryToggle(QUERY_ID);
  const [querySkip, setQuerySkip] = useState(!toggleStatus);
  useEffect(() => {
    setQuerySkip(!toggleStatus);
  }, [toggleStatus]);

  const toggleQuery = useCallback(
    (status: boolean) => {
      setToggleStatus(status);
      // toggle on = skipQuery false
      setQuerySkip(!status);
    },
    [setQuerySkip, setToggleStatus]
  );

  const [loading, { data, refetch, inspect }] = useHostRiskScore({
    filterQuery: hostName ? buildHostNamesFilter([hostName]) : undefined,
    timerange,
    onlyLatest: false,
    sort,
    skip: querySkip,
    pagination: {
      querySize: 1,
      cursorStart: 0,
    },
  });

  const items = useMemo(() => {
    const rules = data && data.length > 0 ? data[0].risk_stats.rule_risks : [];

    return rules
      .sort((a, b) => b.rule_risk - a.rule_risk)
      .map(({ rule_name: name, rule_id: id }, i) => ({ rank: i + 1, name, id }));
  }, [data]);

  const tablePagination = useMemo(
    () => ({
      showPerPageOptions: false,
      pageSize: PAGE_SIZE,
      totalItemCount: items.length,
    }),
    [items.length]
  );

  useQueryInspector({
    queryId: QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="topHostScoreContributors">
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem grow={1}>
            <HeaderSection
              height={!toggleStatus ? 40 : undefined}
              title={i18n.TOP_RISK_SCORE_CONTRIBUTORS}
              hideSubtitle
              toggleQuery={toggleQuery}
              toggleStatus={toggleStatus}
            />
          </EuiFlexItem>
          {toggleStatus && (
            <EuiFlexItem grow={false}>
              <InspectButton queryId={QUERY_ID} title={i18n.TOP_RISK_SCORE_CONTRIBUTORS} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {toggleStatus && (
          <EuiFlexGroup
            data-test-subj="topHostScoreContributors-table"
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

export const TopHostScoreContributors = React.memo(TopHostScoreContributorsComponent);
TopHostScoreContributors.displayName = 'TopHostScoreContributors';

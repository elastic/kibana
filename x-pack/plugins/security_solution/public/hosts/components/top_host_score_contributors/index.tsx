/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

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
import { useHostsRiskScore } from '../../../common/containers/hosts_risk/use_hosts_risk_score';
import { Direction } from '../../../../../timelines/common';
import { HostRiskScoreQueryId } from '../../../common/containers/hosts_risk/types';

export interface TopHostScoreContributorsProps {
  hostName: string;
  from: string;
  to: string;
}

interface TableItem {
  rank: number;
  name: string;
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
  },
];

const PAGE_SIZE = 5;
const QUERY_ID = HostRiskScoreQueryId.TOP_HOST_SCORE_CONTRIBUTORS;

const TopHostScoreContributorsComponent: React.FC<TopHostScoreContributorsProps> = ({
  hostName,
  from,
  to,
}) => {
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const hostRisk = useHostsRiskScore({
    hostName,
    timerange,
    onlyLatest: false,
    queryId: QUERY_ID,
    limit: 1,
    sortOrder: Direction.desc,
  });

  const result = hostRisk?.result;

  const items = useMemo(() => {
    const rules = result && result.length > 0 ? result[0].risk_stats.rule_risks : [];
    return rules
      .sort((a, b) => b.rule_risk - a.rule_risk)
      .map(({ rule_name: name }, i) => ({ rank: i + 1, name }));
  }, [result]);

  const pagination = useMemo(
    () => ({
      hidePerPageOptions: true,
      pageSize: PAGE_SIZE,
      totalItemCount: items.length,
    }),
    [items.length]
  );

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="topHostScoreContributors">
        <EuiFlexGroup gutterSize={'none'}>
          <EuiFlexItem grow={1}>
            <HeaderSection title={i18n.TOP_RISK_SCORE_CONTRIBUTORS} hideSubtitle />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <InspectButton queryId={QUERY_ID} title={i18n.TOP_RISK_SCORE_CONTRIBUTORS} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <EuiInMemoryTable
              items={items}
              columns={columns}
              pagination={pagination}
              loading={hostRisk?.loading}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </InspectButtonContainer>
  );
};

export const TopHostScoreContributors = React.memo(TopHostScoreContributorsComponent);
TopHostScoreContributors.displayName = 'TopHostScoreContributors';

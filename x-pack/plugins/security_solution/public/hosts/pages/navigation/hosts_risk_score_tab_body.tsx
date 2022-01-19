/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiIcon } from '@elastic/eui';
import React, { useMemo } from 'react';
import { HostsComponentsQueryProps } from './types';
import * as i18n from '../translations';
import { useHostsRiskScore } from '../../../common/containers/hosts_risk/use_hosts_risk_score';
import { HostRiskSeverity, HostsRiskScore } from '../../../../common/search_strategy';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HostRiskScore } from '../../components/common/host_risk_score';
import { Columns, ItemsPerRow, PaginatedTable } from '../../../common/components/paginated_table';
import { HostDetailsLink } from '../../../common/components/links';
import { DefaultDraggable } from '../../../common/components/draggables';

export type HostRiskScoreColumns = [
  Columns<HostsRiskScore['host']['name']>,
  Columns<HostsRiskScore['risk_stats']['risk_score']>,
  Columns<HostsRiskScore['risk']>
];

const columns: HostRiskScoreColumns = [
  {
    name: i18n.HOST_NAME,
    field: 'host.name',
    sortable: true,
    truncateText: true,
    render: (hostName) => (
      <DefaultDraggable
        id={`hostname-renderer-default-${hostName}`}
        isDraggable={false}
        field="host.name"
        value={hostName}
      >
        <HostDetailsLink hostName={hostName} />
      </DefaultDraggable>
    ),
  },
  {
    name: i18n.HOST_RISK_SCORE,
    field: 'risk_stats.risk_score',
    render: (riskScore) => (Number.isNaN(riskScore) ? riskScore : Math.round(riskScore)),
    sortable: true,
    truncateText: true,
  },
  {
    name: (
      <EuiToolTip content={i18n.HOST_RISK_TOOLTIP}>
        <>
          {i18n.HOST_RISK_CLASSIFICATION}{' '}
          <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
        </>
      </EuiToolTip>
    ),
    field: 'risk',
    sortable: true,
    truncateText: true,
    render: (riskScore: string) => {
      if (riskScore != null) {
        return <HostRiskScore severity={riskScore as HostRiskSeverity} />;
      }
      return getEmptyTagValue();
    },
  },
];

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS(10),
    numberOfRow: 10,
  },
  {
    text: i18n.ROWS(25),
    numberOfRow: 25,
  },
];

// TODO Make it an enum after merging Host details MR
const QUERY_ID = 'hostRiskTableQueryId';

const HostRiskScoreTabBodyComponent: React.FC<
  Pick<HostsComponentsQueryProps, 'startDate' | 'endDate'>
> = ({ startDate, endDate }) => {
  const timerange = useMemo(
    () => ({
      from: startDate,
      to: endDate,
    }),
    [startDate, endDate]
  );

  const hostRiskScore = useHostsRiskScore({ timerange, queryId: QUERY_ID });

  const totalCount = 100; // TODO get the total amount, not the total per page
  const limit = 10; // TODO number of items per page
  const activePage = 1; // TODO
  const loadPage = () => undefined; // TODO
  const onChange = () => undefined; // TODO

  return (
    <>
      <PaginatedTable
        columns={columns}
        headerCount={totalCount}
        headerTitle={i18n.HOST_RISK}
        headerUnit={i18n.UNIT(totalCount)}
        pageOfItems={hostRiskScore?.result ?? []}
        id={QUERY_ID}
        itemsPerRow={rowItems}
        limit={limit}
        loading={hostRiskScore?.loading ?? false}
        totalCount={totalCount}
        activePage={activePage}
        loadPage={loadPage}
        onChange={onChange}
        // sorting={sorting}
        // updateLimitPagination={updateLimitPagination}
        // updateActivePage={updateActivePage}
      />
    </>
  );
};

HostRiskScoreTabBodyComponent.displayName = 'HostRiskScoreTabBodyComponent';

export const HostRiskScoreTabBody = React.memo(HostRiskScoreTabBodyComponent);

HostRiskScoreTabBody.displayName = 'HostRiskScoreTabBody';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { ID as OverviewHostQueryId } from '../../containers/overview_host';
import { OverviewHost } from '../overview_host';
import { OverviewNetwork } from '../overview_network';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import {
  hostNameExistsFilter,
  filterNetworkExternalAlertData,
} from '../../../common/components/visualization_actions/utils';

const HorizontalSpacer = styled(EuiFlexItem)`
  width: 24px;
`;

interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'setQuery'> {
  filters: Filter[];
  indexNames: string[];
  indexPattern: DataViewBase;
  query: Query;
}

const EventCountsComponent: React.FC<Props> = ({
  filters,
  from,
  indexNames,
  indexPattern,
  query,
  setQuery,
  to,
}) => {
  const { uiSettings } = useKibana().services;

  const [hostFilterQuery, hostKqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters: [...filters, ...hostNameExistsFilter],
      }),
    [filters, indexPattern, query, uiSettings]
  );

  const [networkFilterQuery] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters: [...filters, ...filterNetworkExternalAlertData],
      }),
    [filters, indexPattern, uiSettings, query]
  );

  useInvalidFilterQuery({
    id: OverviewHostQueryId,
    filterQuery: hostFilterQuery || networkFilterQuery,
    kqlError: hostKqlError,
    query,
    startDate: from,
    endDate: to,
  });

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={true}>
        <OverviewHost
          endDate={to}
          filterQuery={hostFilterQuery}
          indexNames={indexNames}
          startDate={from}
          setQuery={setQuery}
        />
      </EuiFlexItem>

      <HorizontalSpacer grow={false} />

      <EuiFlexItem grow={true}>
        <OverviewNetwork
          endDate={to}
          filterQuery={networkFilterQuery}
          indexNames={indexNames}
          startDate={from}
          setQuery={setQuery}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EventCounts = React.memo(EventCountsComponent);

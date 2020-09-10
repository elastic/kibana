/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { OverviewHost } from '../overview_host';
import { OverviewNetwork } from '../overview_network';
import { filterHostData } from '../../../hosts/pages/navigation/alerts_query_tab_body';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { filterNetworkData } from '../../../network/pages/navigation/alerts_query_tab_body';
import {
  Filter,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/public';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

const HorizontalSpacer = styled(EuiFlexItem)`
  width: 24px;
`;

const NO_FILTERS: Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };

interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'setQuery'> {
  filters?: Filter[];
  indexPattern: IIndexPattern;
  query?: Query;
}

const EventCountsComponent: React.FC<Props> = ({
  filters = NO_FILTERS,
  from,
  indexPattern,
  query = DEFAULT_QUERY,
  setQuery,
  to,
}) => {
  const kibana = useKibana();

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={true}>
        <OverviewHost
          endDate={to}
          filterQuery={convertToBuildEsQuery({
            config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
            indexPattern,
            queries: [query],
            filters: [...filters, ...filterHostData],
          })}
          startDate={from}
          setQuery={setQuery}
        />
      </EuiFlexItem>

      <HorizontalSpacer grow={false} />

      <EuiFlexItem grow={true}>
        <OverviewNetwork
          endDate={to}
          filterQuery={convertToBuildEsQuery({
            config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
            indexPattern,
            queries: [query],
            filters: [...filters, ...filterNetworkData],
          })}
          startDate={from}
          setQuery={setQuery}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EventCounts = React.memo(EventCountsComponent);

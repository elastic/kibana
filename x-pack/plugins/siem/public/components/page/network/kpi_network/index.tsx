/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { EuiSpacer } from '@elastic/eui';
import { chunk as _chunk } from 'lodash/fp';
import {
  StatItemsComponent,
  StatItemsProps,
  useKpiMatrixStatus,
} from '../../../../components/stat_items';
import { KpiNetworkData } from '../../../../graphql/types';

import * as i18n from './translations';

const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

const fieldTitleChartMapping: StatItemsProps[] = [
  {
    key: 'networkEvents',
    fields: [
      {
        key: 'networkEvents',
        value: null,
        icon: 'globe',
        color: euiColorVis1,
      },
    ],
    description: i18n.NETWORK_EVENTS,
    enableAreaChart: true,
    grow: 1,
  },
  {
    key: 'UniqueIps',
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        value: null,
        name: i18n.UNIQUE_SOURCE_PRIVATE_IPS_ABBREVIATION,
        description: i18n.UNIQUE_SOURCE_PRIVATE_IPS,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'uniqueDestinationPrivateIps',
        value: null,
        name: i18n.UNIQUE_DESTINATION_PRIVATE_IPS_ABBREVIATION,
        description: i18n.UNIQUE_DESTINATION_PRIVATE_IPS,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    description: i18n.UNIQUE_IPS,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 2,
  },
];

const fieldTitleMatrixMapping: StatItemsProps[] = [
  {
    key: 'uniqueFlowId',
    fields: [
      {
        key: 'uniqueFlowId',
        value: null,
      },
    ],
    description: i18n.UNIQUE_ID,
  },
  {
    key: 'activeAgents',
    fields: [
      {
        key: 'activeAgents',
        value: null,
      },
    ],
    description: i18n.ACTIVE_AGENTS,
  },
  {
    key: 'dnsQueries',
    fields: [
      {
        key: 'dnsQueries',
        value: null,
      },
    ],
    description: i18n.DNS_QUERIES,
  },
  {
    key: 'tlsHandshakes',
    fields: [
      {
        key: 'tlsHandshakes',
        value: null,
      },
    ],
    description: i18n.TLS_HANDSHAKES,
  },
];

const FlexGroup = styled(EuiFlexGroup)`
  min-height: 228px;
`;

export const KpiNetworkBaseComponent = React.memo<{
  fieldsMapping: StatItemsProps[];
  data: KpiNetworkData;
}>(({ fieldsMapping, data }) => {
  const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(fieldsMapping, data);

  return (
    <EuiFlexGroup wrap>
      {statItemsProps.map(mappedStatItemProps => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
});

const kipsPerRow = 2;

export const KpiNetworkComponent = React.memo<KpiNetworkProps>(({ data, loading }) => {
  return loading ? (
    <FlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroup>
  ) : (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={2}>
        <KpiNetworkBaseComponent data={data} fieldsMapping={fieldTitleChartMapping} />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        {_chunk(kipsPerRow, fieldTitleMatrixMapping).map((mappingsPerLine, idx) => (
          <React.Fragment key={`kpi-network-row-${idx}`}>
            {idx % kipsPerRow === 1 && <EuiSpacer size="l" />}
            <KpiNetworkBaseComponent data={data} fieldsMapping={mappingsPerLine} />
          </React.Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

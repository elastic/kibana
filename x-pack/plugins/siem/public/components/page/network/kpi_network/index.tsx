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
  StatItems,
} from '../../../../components/stat_items';
import { KpiNetworkData } from '../../../../graphql/types';

import * as i18n from './translations';

const kipsPerRow = 2;
const kpiWidgetHeight = 228;

const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

export const fieldTitleChartMapping: Readonly<StatItems[]> = [
  {
    key: 'UniqueIps',
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        value: null,
        name: i18n.SRC,
        description: i18n.SOURCE,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'uniqueDestinationPrivateIps',
        value: null,
        name: i18n.DIST,
        description: i18n.DESTINATION,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    description: i18n.UNIQUE_PRIVATE_IPS,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 2,
  },
];

const fieldTitleMatrixMapping: Readonly<StatItems[]> = [
  {
    key: 'networkEvents',
    fields: [
      {
        key: 'networkEvents',
        value: null,
        color: euiColorVis1,
      },
    ],
    description: i18n.NETWORK_EVENTS,
    grow: 1,
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
    key: 'uniqueFlowId',
    fields: [
      {
        key: 'uniqueFlowId',
        value: null,
      },
    ],
    description: i18n.UNIQUE_FLOW_IDS,
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
  min-height: ${kpiWidgetHeight}px;
`;

export const KpiNetworkBaseComponent = ({
  fieldsMapping,
  data,
}: {
  fieldsMapping: Readonly<StatItems[]>;
  data: KpiNetworkData;
}) => {
  const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(fieldsMapping, data);

  return (
    <EuiFlexGroup wrap>
      {statItemsProps.map(mappedStatItemProps => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
};

export const KpiNetworkComponent = React.memo<KpiNetworkProps>(({ data, loading }) => {
  return loading ? (
    <FlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroup>
  ) : (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        {_chunk(kipsPerRow, fieldTitleMatrixMapping).map((mappingsPerLine, idx) => (
          <React.Fragment key={`kpi-network-row-${idx}`}>
            {idx % kipsPerRow === 1 && <EuiSpacer size="l" />}
            <KpiNetworkBaseComponent data={data} fieldsMapping={mappingsPerLine} />
          </React.Fragment>
        ))}
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <KpiNetworkBaseComponent data={data} fieldsMapping={fieldTitleChartMapping} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

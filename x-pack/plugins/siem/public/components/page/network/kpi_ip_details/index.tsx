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
import { KpiIpDetailsData } from '../../../../graphql/types';

import * as i18n from './translations';

const kipsPerRow = 1;
const kpiWidgetHeight = 228;

const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

interface KpiIpDetailsProps {
  data: KpiIpDetailsData;
  loading: boolean;
}

export const fieldTitleChartMapping: Readonly<StatItems[]> = [
  {
    key: 'packets',
    fields: [
      {
        key: 'sourcePackets',
        value: null,
        name: i18n.OUT,
        description: i18n.OUT,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'destinationPackets',
        value: null,
        name: i18n.IN,
        description: i18n.IN,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    description: i18n.PACKETS,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 1,
  },
  {
    key: 'bytes',
    fields: [
      {
        key: 'sourceByte',
        value: null,
        name: i18n.OUT,
        description: i18n.OUT,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'destinationByte',
        value: null,
        name: i18n.IN,
        description: i18n.IN,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    description: i18n.BYTES,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 1,
  },
];

const fieldTitleMatrixMapping: Readonly<StatItems[]> = [
  {
    key: 'connections',
    fields: [
      {
        key: 'connections',
        value: null,
        color: euiColorVis1,
      },
    ],
    description: i18n.CONNECTIONS,
    grow: 1,
  },
  {
    key: 'hosts',
    fields: [
      {
        key: 'hosts',
        value: null,
      },
    ],
    description: i18n.HOSTS,
  },
];

const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

export const KpiIpDetailsBaseComponent = ({
  fieldsMapping,
  data,
}: {
  fieldsMapping: Readonly<StatItems[]>;
  data: KpiIpDetailsData;
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

export const KpiIpDetailsComponent = React.memo<KpiIpDetailsProps>(({ data, loading }) => {
  return loading ? (
    <FlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroup>
  ) : (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={false}>
        {_chunk(kipsPerRow, fieldTitleMatrixMapping).map((mappingsPerLine, idx) => (
          <React.Fragment key={`kpi-ip-details-row-${idx}`}>
            {idx !== 0 && <EuiSpacer size="l" />}
            <KpiIpDetailsBaseComponent data={data} fieldsMapping={mappingsPerLine} />
          </React.Fragment>
        ))}
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <KpiIpDetailsBaseComponent data={data} fieldsMapping={fieldTitleChartMapping} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

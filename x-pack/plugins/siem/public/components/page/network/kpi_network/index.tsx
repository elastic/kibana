/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { EuiSpacer } from '@elastic/eui';
import { chunk as _chunk } from 'lodash/fp';
import {
  StatItem,
  StatItems,
  StatItemsComponent,
  StatItemsProps,
} from '../../../../components/stat_items';
import { KpiNetworkData } from '../../../../graphql/types';

import * as i18n from './translations';
import { AreaChartData, BarChartData } from '../../../charts/common';

const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

const fieldTitleChartMapping: Readonly<StatItems[]> = [
  {
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

const fieldTitleMatrixMapping: Readonly<StatItems[]> = [
  {
    fields: [
      {
        key: 'uniqueFlowId',
        value: null,
      },
    ],
    description: i18n.UNIQUE_ID,
  },
  {
    fields: [
      {
        key: 'activeAgents',
        value: null,
      },
    ],
    description: i18n.ACTIVE_AGENTS,
  },
  {
    fields: [
      {
        key: 'dnsQueries',
        value: null,
      },
    ],
    description: i18n.DNS_QUERIES,
  },
  {
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

export const KpiNetworkBaseComponent = pure<{
  fieldsMapping: Readonly<StatItems[]>;
  data: KpiNetworkData;
}>(({ fieldsMapping, data }) => {
  return (
    <EuiFlexGroup wrap>
      {fieldsMapping.map(stat => {
        let statItemProps: StatItemsProps = {
          ...stat,
          key: `kpi-network-${stat.description}`,
        };

        if (stat.fields != null)
          statItemProps = {
            ...statItemProps,
            fields: addValueToFields(stat.fields, data),
          };

        if (stat.enableAreaChart)
          statItemProps = {
            ...statItemProps,
            areaChart: addValueToAreaChart(stat.fields, data),
          };

        if (stat.enableBarChart != null)
          statItemProps = {
            ...statItemProps,
            barChart: addValueToBarChart(stat.fields, data),
          };

        return <StatItemsComponent {...statItemProps} />;
      })}
    </EuiFlexGroup>
  );
});

const kipsPerRow = 2;

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => {
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

const addValueToFields = (fields: StatItem[], data: KpiNetworkData): StatItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));

const addValueToAreaChart = (fields: StatItem[], data: KpiNetworkData): AreaChartData[] =>
  fields
    .filter(field => get(`${field.key}Histogram`, data) != null)
    .map(field => ({
      ...field,
      value: get(`${field.key}Histogram`, data),
      key: `${field.key}Histogram`,
    }));

const addValueToBarChart = (fields: StatItem[], data: KpiNetworkData): BarChartData[] => {
  if (fields.length === 0) return [];
  return fields.reduce((acc: BarChartData[], field: StatItem, idx: number) => {
    const key: string = get('key', field);
    const x: number | null = getOr(null, key, data);
    const y: string = get(`${idx}.name`, fields) || getOr('', `${idx}.description`, fields);

    return acc.concat([
      {
        ...field,
        value: [
          {
            x,
            y,
          },
        ],
      },
    ]);
  }, []);
};

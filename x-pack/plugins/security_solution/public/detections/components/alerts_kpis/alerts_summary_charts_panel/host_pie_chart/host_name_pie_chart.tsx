/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, euiPaletteColorBlind } from '@elastic/eui';
import React, { useMemo } from 'react';
import uuid from 'uuid';
// import { Legend } from '../../../../../common/components/charts/legend';
import { DraggableLegend } from '../../../../../common/components/charts/draggable_legend';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { escapeDataProviderId } from '../../../../../common/components/drag_and_drop/helpers';
// import { FormattedCount } from '../../../../common/components/formatted_number';
// import type { EuiBasicTableColumn } from '@elastic/eui';
// import { DefaultDraggable } from '../../../../common/components/draggables';
import type { LegendItem } from '../../../../../common/components/charts/draggable_legend_item';
import { PieChart } from './pie_chart';

// const LEGEND_WITH_COUNTS_WIDTH = 300;

// const StyledLegendFlexItem = styled(EuiFlexItem)`
//   padding: 0 4x;
// `;
// const StyledFlexItem = styled(EuiFlexItem)`
//   padding: 4 0px;
// `;
//
// GOES TO types.ts
interface AlertsByHostType {
  key: string;
  value: number;
  label: string;
}

type ParsedHostsAlertsData = AlertsByHostType[] | null | undefined;

interface HostPieChartProps {
  data: ParsedHostsAlertsData;
  isLoading: boolean;
  uniqueQueryId: string;
}

export const getColor = (count: number, index: number) => {
  const rotNum = Math.ceil(count / 10);
  // console.log(count, rotNum);
  return euiPaletteColorBlind({ sortBy: 'natural', rotations: rotNum })[index];
};

export const HostPieChart: React.FC<HostPieChartProps> = ({ data, isLoading, uniqueQueryId }) => {
  // const items = data ?? [];

  const total = useMemo(() => {
    return data
      ? data.reduce(function (prev, cur) {
          return prev + cur.value;
        }, 0)
      : 0;
  }, [data]);

  const legendItems: LegendItem[] = useMemo(() => {
    const legend = data
      ? data.map((d, i) => ({
          field: d.key,
          value: d.label,
          dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d.key}`),
          count: d.value,
          color: getColor(data?.length, i),
        }))
      : [];
    // console.log(data);
    // console.log(legend);
    return legend;
  }, [data]);
  // console.log(legendItems);
  // const sorting: { sort: { field: keyof SeverityBuckets; direction: SortOrder } } = {
  //   sort: {
  //     field: 'value',
  //     direction: 'desc',
  //   },
  // };

  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel>
          <HeaderSection
            id={uniqueQueryId}
            inspectTitle={'Alert by host name'}
            outerDirection="row"
            title={'Alert by host name'}
            titleSize="xs"
            hideSubtitle
          />
          <EuiFlexGroup gutterSize="l">
            {/* <StyledLegendFlexItem grow={false}> */}
            <EuiFlexItem>
              {legendItems.length > 0 && (
                <DraggableLegend legendItems={legendItems} height={150} minWidth={200} />
              )}
            </EuiFlexItem>
            {/* <StyledFlexItem key="alerts-by-host-name-pie-chart" grow={false}> */}
            <EuiFlexItem grow={false}>
              <PieChart data={data} height={150} total={total} />
            </EuiFlexItem>
            {/* </StyledFlexItem> */}
          </EuiFlexGroup>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

HostPieChart.displayName = 'DetectionsTable';

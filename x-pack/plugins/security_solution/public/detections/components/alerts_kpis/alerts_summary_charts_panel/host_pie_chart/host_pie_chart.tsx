/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import uuid from 'uuid';
import { isEmpty } from 'lodash/fp';
import type { ElementClickListener } from '@elastic/charts';
import { DraggableLegend } from '../../../../../common/components/charts/draggable_legend';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { escapeDataProviderId } from '../../../../../common/components/drag_and_drop/helpers';
import type { LegendItem } from '../../../../../common/components/charts/draggable_legend_item';
import type { ChartsPanelProps, HostData } from '../types';
import { PieChart } from './pie_chart';

const PIE_HEIGHT = 150;

export const HostPieChart: React.FC<ChartsPanelProps> = ({
  data,
  isLoading,
  uniqueQueryId,
  addFilter,
}) => {
  const items = data as HostData[];

  const total = useMemo(() => {
    return items
      ? items.reduce(function (prev, cur) {
          return prev + cur.value;
        }, 0)
      : 0;
  }, [items]);

  const legendItems: LegendItem[] = useMemo(() => {
    const legend = items
      ? items.map((d, i) => ({
          field: 'host.name',
          value: d.label,
          dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d.key}`),
          count: d.value,
        }))
      : [];
    return legend;
  }, [items]);

  const onElementClick: ElementClickListener = useCallback(
    (event) => {
      const flattened = event.flat(2);
      const host =
        flattened.length > 0 &&
        'groupByRollup' in flattened[0] &&
        flattened[0].groupByRollup != null
          ? `${flattened[0].groupByRollup}`
          : '';

      if (addFilter != null && !isEmpty(host.trim())) {
        addFilter({ field: 'host.name', value: host });
      }
    },
    [addFilter]
  );

  return (
    <EuiFlexItem style={{ minWidth: 350 }}>
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
            <EuiFlexItem>
              {legendItems.length > 0 && (
                <DraggableLegend legendItems={legendItems} height={150} minWidth={200} />
              )}
            </EuiFlexItem>
            <EuiFlexItem key="alerts-by-host-name-pie-chart" grow={false}>
              <PieChart
                data={items}
                height={PIE_HEIGHT}
                total={total}
                onElementClick={onElementClick}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

HostPieChart.displayName = 'HostPieChart';

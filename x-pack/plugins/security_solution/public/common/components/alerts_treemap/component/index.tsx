/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Datum,
  ElementClickListener,
  Partition,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { DraggableLegend } from '../../charts/draggable_legend';
import { LegendItem } from '../../charts/draggable_legend_item';
import { AlertSearchResponse } from '../../../../detections/containers/detection_engine/alerts/types';
import { getFlattenedBuckets } from '../flatten/get_flattened_buckets';
import { getFlattenedLegendItems } from './get_flattened_legend_items';
import {
  getGroupByFieldsOnClick,
  getMaxRiskSubAggregations,
  getUpToMaxBuckets,
  hasOptionalStackByField,
} from './helpers';
import { getLayersMultiDimensional, getLayersOneDimension } from './layers';
import { getFirstGroupLegendItems } from './legend';
import { NoData } from './no_data';
import type { AlertsTreeMapAggregation, FlattenedBucket, RawBucket } from '../types';

export const DEFAULT_MIN_CHART_HEIGHT = 370; // px
const DEFAULT_LEGEND_WIDTH = 300; // px

interface TreemapProps {
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
  data: AlertSearchResponse<unknown, AlertsTreeMapAggregation>;
  maxBuckets: number;
  minChartHeight?: number;
  stackByField0: string;
  stackByField1: string | undefined;
}

const Wrapper = styled.div`
  margin-top: -${({ theme }) => theme.eui.euiSizeS};
`;

const LegendContainer = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const ChartFlexItem = styled(EuiFlexItem)<{ minChartHeight: number }>`
  min-height: ${({ minChartHeight }) => `${minChartHeight}px`};
`;

const AlertsTreemapComponent = ({
  addFilter,
  data,
  maxBuckets,
  minChartHeight = DEFAULT_MIN_CHART_HEIGHT,
  stackByField0,
  stackByField1,
}: TreemapProps) => {
  const buckets: RawBucket[] = useMemo(
    () =>
      getUpToMaxBuckets({
        buckets: data.aggregations?.stackByField0?.buckets,
        maxItems: maxBuckets,
      }),
    [data.aggregations?.stackByField0?.buckets, maxBuckets]
  );

  const maxRiskSubAggregations = useMemo(() => getMaxRiskSubAggregations(buckets), [buckets]);

  const flattenedBuckets: FlattenedBucket[] = useMemo(
    () =>
      getFlattenedBuckets({
        buckets,
        maxRiskSubAggregations,
        stackByField0,
      }),
    [buckets, maxRiskSubAggregations, stackByField0]
  );

  const legendItems: LegendItem[] = useMemo(
    () =>
      flattenedBuckets == null
        ? getFirstGroupLegendItems({
            buckets,
            maxRiskSubAggregations,
            stackByField0,
          })
        : getFlattenedLegendItems({
            buckets,
            flattenedBuckets,
            maxRiskSubAggregations,
            stackByField0,
            stackByField1,
          }),
    [buckets, flattenedBuckets, maxRiskSubAggregations, stackByField0, stackByField1]
  );

  const onElementClick: ElementClickListener = useCallback(
    (event) => {
      const { groupByField0, groupByField1 } = getGroupByFieldsOnClick(event);

      if (addFilter != null && !isEmpty(groupByField0.trim())) {
        addFilter({ field: stackByField0, value: groupByField0 });
      }

      if (addFilter != null && !isEmpty(stackByField1?.trim()) && !isEmpty(groupByField1.trim())) {
        addFilter({ field: `${stackByField1}`, value: groupByField1 });
      }
    },
    [addFilter, stackByField0, stackByField1]
  );

  const layers = useMemo(
    () =>
      hasOptionalStackByField(stackByField1)
        ? getLayersMultiDimensional(maxRiskSubAggregations)
        : getLayersOneDimension(maxRiskSubAggregations),
    [maxRiskSubAggregations, stackByField1]
  );

  const valueAccessor = useMemo(
    () =>
      hasOptionalStackByField(stackByField1)
        ? (d: Datum) => d.stackByField1DocCount
        : (d: Datum) => d.doc_count,
    [stackByField1]
  );

  const normalizedData: FlattenedBucket[] = hasOptionalStackByField(stackByField1)
    ? flattenedBuckets
    : buckets;

  if (buckets.length === 0) {
    return <NoData />;
  }

  return (
    <Wrapper data-test-subj="treemap" className="eui-yScroll">
      <EuiFlexGroup gutterSize="none">
        <ChartFlexItem grow={true} minChartHeight={minChartHeight}>
          <Chart>
            <Settings showLegend={false} onElementClick={onElementClick} />
            <Partition
              data={normalizedData}
              id="spec_1"
              layers={layers}
              layout={PartitionLayout.treemap}
              valueAccessor={valueAccessor}
            />
          </Chart>
        </ChartFlexItem>

        <EuiFlexItem grow={false}>
          <LegendContainer>
            {legendItems.length > 0 && (
              <DraggableLegend
                height={minChartHeight}
                legendItems={legendItems}
                width={DEFAULT_LEGEND_WIDTH}
              />
            )}
          </LegendContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Wrapper>
  );
};

export const AlertsTreemap = React.memo(AlertsTreemapComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiHorizontalRule,
  // @ts-ignore
  EuiBarSeries,
  // @ts-ignore
  EuiStat,
  // @ts-ignore
  EuiSeriesChartUtils,
  EuiIcon,
} from '@elastic/eui';

const { SCALE, ORIENTATION } = EuiSeriesChartUtils;
const iconType = 'stopFilled';
import { EuiSeriesChart, EuiAreaSeries } from '@elastic/eui/lib/experimental';
import numeral from '@elastic/numeral';
import React from 'react';
import { pure } from 'recompose';

import { getEmptyTagValue } from '../empty_value';
import { LoadingPanel } from '../loading';

export interface StatItem {
  key: string;
  description?: string;
  value: number | undefined | null;
  color: string;
}

export interface AreaChartData {
  key: string;
  value: ChartData[] | null;
  color: string;
}

export interface ChartData {
  x: number;
  y: number | string;
  y0?: number;
}

export interface BarChartData {
  key: string;
  value: ChartData[] | null;
  color: string;
}

export interface StatItems {
  fields: StatItem[];
  description?: string;
  areaChart?: AreaChartData[];
  barChart?: BarChartData[];
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
}

export interface StatItemsProps extends StatItems {
  isLoading: boolean;
  key: string;
}

const CardTitle = pure<{ isLoading: boolean; value: number | null | undefined }>(
  ({ isLoading, value }) => (
    <span className="eui-displayInlineBlock">
      {isLoading ? (
          <EuiLoadingSpinner size="m" />
      ) : value != null ? (
        numeral(value).format('0,0')
      ) : (
        getEmptyTagValue()
      )}
    </span>
  )
);

const getChartSpan = (barChart: BarChartData[] | undefined | null, areaChart: AreaChartData[] | undefined | null) => {
  return barChart && barChart.length && areaChart && areaChart.length ? 5 : 10
}

export const StatItemsComponent = pure<StatItemsProps>(
  ({ fields, description, isLoading, key, grow, barChart, areaChart }) => (
    <EuiFlexItem key={`card-items-${key}`} grow={grow || null}>
      <EuiPanel>
        <EuiStat description={description} titleSize="m" title={
          <EuiFlexGroup justifyContent="spaceBetween" component="span">
            {
              fields.map(field => (
                <EuiFlexItem component="span" key={`stat-items-field-${field.key}`}>
                  <EuiFlexGroup
                    justifyContent="spaceBetween"
                    component="span"
                    gutterSize="m"
                    alignItems="center"
                  >
                    <EuiFlexItem component="span" grow={2}>
                      <EuiIcon type={iconType} color={field.color} />
                    </EuiFlexItem>
                    <EuiFlexItem component="span" grow={4}>
                      <CardTitle isLoading={isLoading} value={field.value} />
                    </EuiFlexItem>
                    <EuiFlexItem component="span" grow={4}>
                    {field.description}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))
            }
          </EuiFlexGroup>
      }/>
      { areaChart || barChart ? <EuiHorizontalRule /> : null }
      { isLoading && (areaChart || barChart) ? <LoadingPanel
          height="auto"
          width="100%"
          text="Loading"
          data-test-subj="InitialLoadingPanelLoadMoreTable"
        /> : (
        <EuiFlexGroup gutterSize="none">
          {
            barChart ?  (
              <EuiFlexItem grow={getChartSpan(barChart, areaChart)}>
                <EuiSeriesChart showDefaultAxis={true} height={100} yType={SCALE.ORDINAL} orientation={ORIENTATION.HORIZONTAL}>
                  {
                    barChart.map(series => series.value != null ? (
                      <EuiBarSeries key={`stat-items-barchart-${series.key}`} 
                        name={`stat-items-barchart-${series.key}`}
                        data={series.value}
                        color={series.color} />
                    ) : null)
                  }
                </EuiSeriesChart>
              </EuiFlexItem>
            ) : null
          }
          {
            areaChart ?  (
              <EuiFlexItem grow={getChartSpan(barChart, areaChart)}>
                <EuiSeriesChart showDefaultAxis={true} height={100}>
                  {
                    areaChart.map(series => series.value != null ? (
                      /**
                       * Placing ts-ignore here for fillOpacity
                       * */
                      // @ts-ignore
                      <EuiAreaSeries key={`stat-items-areachart-${series.key}`} 
                        name={`stat-items-areachart-${series.key}`}
                        data={series.value}
                        fillOpacity={0.04}
                        color={series.color} />
                    ) : null)
                  }
                </EuiSeriesChart>
              </EuiFlexItem>
            ) : null
          }
      
        </EuiFlexGroup>
      )}
      </EuiPanel>
    </EuiFlexItem>
  )
);

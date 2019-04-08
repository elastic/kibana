/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module '@elastic/eui/lib/experimental' {
  import { CommonProps } from '@elastic/eui/src/components/common';
  export type EuiSeriesChartProps = CommonProps & {
    xType?: string;
    stackBy?: string;
    statusText?: string;
    yDomain?: number[];
    showCrosshair?: boolean;
    showDefaultAxis?: boolean;
    enableSelectionBrush?: boolean;
    crosshairValue?: number;
    onSelectionBrushEnd?: (args: any) => void;
    onCrosshairUpdate?: (crosshairValue: number) => void;
  };
  export const EuiSeriesChart: React.SFC<EuiSeriesChartProps>;

  type EuiSeriesProps = CommonProps & {
    data: Array<{ x: number; y: number; y0?: number }>;
    lineSize?: number;
    name: string;
    color?: string;
    marginLeft?: number;
  };
  export const EuiLineSeries: React.SFC<EuiSeriesProps>;
  export const EuiAreaSeries: React.SFC<EuiSeriesProps>;
  export const EuiBarSeries: React.SFC<EuiSeriesProps>;

  type EuiYAxisProps = CommonProps & {
    tickFormat: (value: number) => string;
    marginLeft?: number;
  };
  export const EuiYAxis: React.SFC<EuiYAxisProps>;

  type EuiXAxisProps = CommonProps & {
    tickFormat?: (value: number) => string;
    marginLeft?: number;
  };
  export const EuiXAxis: React.SFC<EuiXAxisProps>;

  export interface EuiDataPoint {
    seriesIndex: number;
    x: number;
    y: number;
    originalValues: {
      x: number;
      y: number;
      x0?: number;
    };
  }

  export interface EuiFormattedValue {
    title: any;
    value: any;
  }
  type EuiCrosshairXProps = CommonProps & {
    seriesNames: string[];
    titleFormat?: (dataPoints: EuiDataPoint[]) => EuiFormattedValue | undefined;
    itemsFormat?: (dataPoints: EuiDataPoint[]) => EuiFormattedValue[];
  };
  export const EuiCrosshairX: React.SFC<EuiCrosshairXProps>;
}

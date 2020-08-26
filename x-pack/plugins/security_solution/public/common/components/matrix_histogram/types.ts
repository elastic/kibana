/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitleSize } from '@elastic/eui';
import { ScaleType, Position, TickFormatter } from '@elastic/charts';
import { ActionCreator } from 'redux';
import { ESQuery } from '../../../../common/typed_json';
import { InputsModelId } from '../../store/inputs/constants';
import { HistogramType } from '../../../graphql/types';
import { UpdateDateRange } from '../charts/common';
import { GlobalTimeArgs } from '../../containers/use_global_time';

export type MatrixHistogramMappingTypes = Record<
  string,
  { key: string; value: null; color?: string | undefined }
>;
export interface MatrixHistogramOption {
  text: string;
  value: string;
}

export type GetSubTitle = (count: number) => string;
export type GetTitle = (matrixHistogramOption: MatrixHistogramOption) => string;

export interface MatrixHisrogramConfigs {
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  hideHistogramIfEmpty?: boolean;
  histogramType: HistogramType;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string | GetTitle;
  titleSize?: EuiTitleSize;
}

interface MatrixHistogramBasicProps {
  chartHeight?: number;
  defaultIndex: string[];
  defaultStackByOption: MatrixHistogramOption;
  dispatchSetAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
  endDate: GlobalTimeArgs['to'];
  headerChildren?: React.ReactNode;
  hideHistogramIfEmpty?: boolean;
  id: string;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  panelHeight?: number;
  setQuery: GlobalTimeArgs['setQuery'];
  startDate: GlobalTimeArgs['from'];
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title?: string | GetTitle;
  titleSize?: EuiTitleSize;
}

export interface MatrixHistogramQueryProps {
  endDate: string;
  errorMessage: string;
  filterQuery?: ESQuery | string | undefined;
  setAbsoluteRangeDatePicker?: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
  setAbsoluteRangeDatePickerTarget?: InputsModelId;
  stackByField: string;
  startDate: string;
  indexToAdd?: string[] | null;
  isInspected: boolean;
  histogramType: HistogramType;
}

export interface MatrixHistogramProps extends MatrixHistogramBasicProps {
  legendPosition?: Position;
  scaleType?: ScaleType;
  showLegend?: boolean;
  showSpacer?: boolean;
  timelineId?: string;
  yTickFormatter?: (value: number) => string;
}

export interface HistogramBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
}
export interface GroupBucket {
  key: string;
  signals: {
    buckets: HistogramBucket[];
  };
}

export interface BarchartConfigs {
  series: {
    xScaleType: ScaleType;
    yScaleType: ScaleType;
    stackAccessors: string[];
  };
  axis: {
    xTickFormatter: TickFormatter;
    yTickFormatter: TickFormatter;
    tickSize: number;
  };
  settings: {
    legendPosition: Position;
    onBrushEnd: UpdateDateRange;
    showLegend: boolean;
    showLegendExtra: boolean;
    theme: {
      scales: {
        barsPadding: number;
      };
      chartMargins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
      chartPaddings: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
    };
  };
  customHeight: number;
}

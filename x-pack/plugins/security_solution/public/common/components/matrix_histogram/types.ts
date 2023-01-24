/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiTitleSize } from '@elastic/eui';
import type { ScaleType, Position, TickFormatter } from '@elastic/charts';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ActionCreator } from 'redux';
import type { ESQuery } from '../../../../common/typed_json';
import type { InputsModelId } from '../../store/inputs/constants';
import type { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import type { UpdateDateRange } from '../charts/common';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import type { FieldValueThreshold } from '../../../detections/components/rules/threshold_input';
import type { GetLensAttributes, LensAttributes } from '../visualization_actions/types';

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

export interface MatrixHistogramConfigs {
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  getLensAttributes?: GetLensAttributes;
  hideHistogramIfEmpty?: boolean;
  histogramType: MatrixHistogramType;
  legendPosition?: Position;
  lensAttributes?: LensAttributes;
  mapping?: MatrixHistogramMappingTypes;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string | GetTitle;
  titleSize?: EuiTitleSize;
}

interface MatrixHistogramBasicProps {
  chartHeight?: number;
  defaultStackByOption: MatrixHistogramOption;
  endDate: GlobalTimeArgs['to'];
  headerChildren?: React.ReactNode;
  hideHistogramIfEmpty?: boolean;
  id: string;
  legendPosition?: Position;
  mapping?: MatrixHistogramMappingTypes;
  panelHeight?: number;
  paddingSize?: 's' | 'm' | 'l' | 'none';
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
  indexNames: string[];
  filterQuery?: ESQuery | string | undefined;
  onError?: () => void;
  setAbsoluteRangeDatePicker?: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
  setAbsoluteRangeDatePickerTarget?: InputsModelId;
  stackByField: string;
  startDate: string;
  histogramType: MatrixHistogramType;
  threshold?: FieldValueThreshold;
  skip?: boolean;
  isPtrIncluded?: boolean;
  includeMissingData?: boolean;
  runtimeMappings?: MappingRuntimeFields;
}

export interface MatrixHistogramProps extends MatrixHistogramBasicProps {
  legendPosition?: Position;
  scaleType?: ScaleType;
  showLegend?: boolean;
  showSpacer?: boolean;
  timelineId?: string;
  yTickFormatter?: (value: number) => string;
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

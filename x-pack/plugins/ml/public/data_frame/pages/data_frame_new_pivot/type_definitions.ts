/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CommonProps,
  EuiButtonIconProps,
  EuiButtonPropsForButtonOrLink,
  IconType,
} from '@elastic/eui';
import { FunctionComponent, ReactNode, ReactPropTypes } from 'react';

import { DefaultOperator } from 'elasticsearch';

import { Dictionary } from 'x-pack/plugins/ml/common/types/common';

// The display label used for an aggregation e.g. sum(bytes).
export type Label = string;

// Label object structured for EUI's ComboBox.
export interface DropDownLabel {
  label: Label;
}

// Label object structure for EUI's ComboBox with support for nesting.
export interface DropDownOption {
  label: Label;
  options: DropDownLabel[];
}

// The internal representation of an aggregatino definition.
export interface OptionsDataElement {
  agg: string;
  field: string;
  formRowLabel: string;
}

export type OptionsDataElementDict = Dictionary<OptionsDataElement>;

export interface SimpleQuery {
  query: {
    query_string: {
      query: string;
      default_operator: DefaultOperator;
    };
  };
}

type MlListGroupProps = CommonProps & {
  bordered?: boolean;
  flush?: boolean;
  listItems?: Array<FunctionComponent<MlListGroupItemProps>>;
  maxWidth?: boolean | number | string;
  showToolTips?: boolean;
  wrapText?: boolean;
};

export type MlListGroup = FunctionComponent<MlListGroupProps>;

type MlListGroupItemProps = CommonProps & {
  size?: 'xs' | 's' | 'm' | 'l';
  label: ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  href?: string;
  iconType?: IconType;
  icon?: ReactPropTypes['element'];
  showToolTip?: boolean;
  extraAction?: EuiButtonPropsForButtonOrLink<
    CommonProps &
      EuiButtonIconProps & {
        iconType: IconType;
        alwaysShow?: boolean;
      }
  >;
  wrapText?: boolean;
  onClick?(): void;
};

export type MlListGroupItem = FunctionComponent<MlListGroupItemProps>;

// DataFramePreviewRequest
type PivotGroupBySupportedAggs = 'terms';
type PivotGroupBy = {
  [key in PivotGroupBySupportedAggs]: {
    field: string;
  }
};
type PivotGroupByDict = Dictionary<PivotGroupBy>;

type PivotAggSupportedAggs = 'avg' | 'cardinality' | 'max' | 'min' | 'sum' | 'value_count';
type PivotAgg = {
  [key in PivotAggSupportedAggs]: {
    field: string;
  }
};
type PivotAggDict = Dictionary<PivotAgg>;

export interface DataFramePreviewRequest {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
  query?: any;
  source: string;
}

export interface DataFrameRequest extends DataFramePreviewRequest {
  dest: string;
}

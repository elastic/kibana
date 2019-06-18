/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Omit } from '../../../common/utility_types';
import { InputsModelId } from './constants';
import { CONSTANTS } from '../../components/url_state/constants';

export interface AbsoluteTimeRange {
  kind: 'absolute';
  fromStr: undefined;
  toStr: undefined;
  from: number;
  to: number;
}

export interface RelativeTimeRange {
  kind: 'relative';
  fromStr: string;
  toStr: string;
  from: number;
  to: number;
}

export const isRelativeTimeRange = (
  timeRange: RelativeTimeRange | AbsoluteTimeRange | URLTimeRange
): timeRange is RelativeTimeRange => timeRange.kind === 'relative';

export const isAbsoluteTimeRange = (
  timeRange: RelativeTimeRange | AbsoluteTimeRange | URLTimeRange
): timeRange is AbsoluteTimeRange => timeRange.kind === 'absolute';

export type TimeRange = AbsoluteTimeRange | RelativeTimeRange;

export type URLTimeRange = Omit<TimeRange, 'from' | 'to'> & {
  from: string | TimeRange['from'];
  to: string | TimeRange['to'];
};

export interface Policy {
  kind: 'manual' | 'interval';
  duration: number; // in ms
}

export type Refetch = () => void;
export interface GlobalQuery {
  id: string;
  loading: boolean;
  refetch: null | Refetch;
}

export interface InputsRange {
  timerange: TimeRange;
  policy: Policy;
  query: GlobalQuery[];
  linkTo: InputsModelId[];
}

export interface LinkTo {
  linkTo: InputsModelId[];
}

export interface InputsModel {
  global: InputsRange;
  timeline: InputsRange;
}
export interface UrlInputsModelInputs {
  linkTo: InputsModelId[];
  [CONSTANTS.timerange]: TimeRange;
}
export interface UrlInputsModel {
  global: UrlInputsModelInputs;
  timeline: UrlInputsModelInputs;
}

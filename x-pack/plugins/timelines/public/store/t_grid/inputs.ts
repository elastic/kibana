/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'redux';
import { Query, Filter, SavedQuery } from '../../../../../../src/plugins/data/public';

export type InputsModelId = 'global' | 'timeline';

export enum URL_CONSTANTS {
  appQuery = 'query',
  caseDetails = 'case.details',
  casePage = 'case.page',
  detectionsPage = 'detections.page',
  filters = 'filters',
  hostsDetails = 'hosts.details',
  hostsPage = 'hosts.page',
  management = 'management',
  networkDetails = 'network.details',
  networkPage = 'network.page',
  overviewPage = 'overview.page',
  savedQuery = 'savedQuery',
  sourcerer = 'sourcerer',
  timeline = 'timeline',
  timelinePage = 'timeline.page',
  timerange = 'timerange',
  unknown = 'unknown',
}

export interface AbsoluteTimeRange {
  kind: 'absolute';
  fromStr?: string;
  toStr?: string;
  from: string;
  to: string;
}

export interface RelativeTimeRange {
  kind: 'relative';
  fromStr: string;
  toStr: string;
  from: string;
  to: string;
}

export type TimeRange = AbsoluteTimeRange | RelativeTimeRange;

export type URLTimeRange = TimeRange;

export interface Policy {
  kind: 'manual' | 'interval';
  duration: number; // in ms
}

interface InspectVariables {
  inspect: boolean;
}
export type RefetchWithParams = ({ inspect }: InspectVariables) => void;
export type RefetchKql = (dispatch: Dispatch) => boolean;
export type Refetch = () => void;

export interface InspectQuery {
  dsl: string[];
  response: string[];
}

export interface GlobalGenericQuery {
  inspect: InspectQuery | null;
  isInspected: boolean;
  loading: boolean;
  selectedInspectIndex: number;
}

export interface GlobalGraphqlQuery extends GlobalGenericQuery {
  id: string;
  refetch: null | Refetch | RefetchWithParams;
}
export interface GlobalKqlQuery extends GlobalGenericQuery {
  id: 'kql';
  refetch: RefetchKql;
}

export type GlobalQuery = GlobalGraphqlQuery | GlobalKqlQuery;

export interface InputsRange {
  timerange: TimeRange;
  policy: Policy;
  queries: GlobalQuery[];
  linkTo: InputsModelId[];
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  fullScreen?: boolean;
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
  [URL_CONSTANTS.timerange]: TimeRange;
}
export interface UrlInputsModel {
  global: UrlInputsModelInputs;
  timeline: UrlInputsModelInputs;
}

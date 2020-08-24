/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';
import { CloudEcs } from '../../../ecs/cloud';
import { HostEcs } from '../../../ecs/host';

import {
  CursorType,
  Inspect,
  Maybe,
  PageInfoPaginated,
  RequestOptionsPaginated,
  SortField,
  TimerangeInput,
} from '..';

export enum HostsQueries {
  hosts = 'hosts',
  hostOverview = 'hostOverview',
}

export enum HostPolicyResponseActionStatus {
  success = 'success',
  failure = 'failure',
  warning = 'warning',
}

export interface EndpointFields {
  endpointPolicy?: Maybe<string>;

  sensorVersion?: Maybe<string>;

  policyStatus?: Maybe<HostPolicyResponseActionStatus>;
}

export interface HostItem {
  _id?: Maybe<string>;

  cloud?: Maybe<CloudEcs>;

  endpoint?: Maybe<EndpointFields>;

  host?: Maybe<HostEcs>;

  lastSeen?: Maybe<string>;
}

export interface HostsEdges {
  node: HostItem;

  cursor: CursorType;
}

export interface HostsStrategyResponse extends IEsSearchResponse {
  edges: HostsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface HostOverviewStrategyResponse extends IEsSearchResponse, HostItem {
  inspect?: Maybe<Inspect>;
}

export interface HostsRequestOptions extends RequestOptionsPaginated {
  sort: SortField;
  defaultIndex: string[];
}

export interface HostLastFirstSeenRequestOptions extends Partial<RequestOptionsPaginated> {
  hostName: string;
}

export interface HostOverviewRequestOptions extends HostLastFirstSeenRequestOptions {
  fields: string[];
  timerange: TimerangeInput;
}

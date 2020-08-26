/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESTermQuery } from '../../../../common/typed_json';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';

import { NavTab } from '../../../common/components/navigation/types';
import { FlowTargetSourceDest } from '../../../graphql/types';
import { networkModel } from '../../store';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

import { SetAbsoluteRangeDatePicker } from '../types';
import { NarrowDateRange } from '../../../common/components/ml/types';

interface QueryTabBodyProps extends Pick<GlobalTimeArgs, 'setQuery' | 'deleteQuery'> {
  skip: boolean;
  type: networkModel.NetworkType;
  startDate: string;
  endDate: string;
  filterQuery?: string | ESTermQuery;
  narrowDateRange?: NarrowDateRange;
}

export type NetworkComponentQueryProps = QueryTabBodyProps;

export type IPsQueryTabBodyProps = QueryTabBodyProps & {
  indexPattern: IIndexPattern;
  flowTarget: FlowTargetSourceDest;
};

export type TlsQueryTabBodyProps = QueryTabBodyProps & {
  flowTarget: FlowTargetSourceDest;
  ip?: string;
};

export type HttpQueryTabBodyProps = QueryTabBodyProps & {
  ip?: string;
};

export type NetworkRoutesProps = GlobalTimeArgs & {
  networkPagePath: string;
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
  indexPattern: IIndexPattern;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
};

export type KeyNetworkNavTabWithoutMlPermission = NetworkRouteType.dns &
  NetworkRouteType.flows &
  NetworkRouteType.http &
  NetworkRouteType.tls &
  NetworkRouteType.alerts;

type KeyNetworkNavTabWithMlPermission = KeyNetworkNavTabWithoutMlPermission &
  NetworkRouteType.anomalies;

type KeyNetworkNavTab = KeyNetworkNavTabWithoutMlPermission | KeyNetworkNavTabWithMlPermission;

export type NetworkNavTab = Record<KeyNetworkNavTab, NavTab>;

export enum NetworkRouteType {
  flows = 'flows',
  dns = 'dns',
  anomalies = 'anomalies',
  tls = 'tls',
  http = 'http',
  alerts = 'external-alerts',
}

export type GetNetworkRoutePath = (
  capabilitiesFetched: boolean,
  hasMlUserPermission: boolean
) => string;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';
import { ESTermQuery } from '../../../../common/typed_json';

import { NavTab } from '../../../common/components/navigation/types';
import { networkModel } from '../../store';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

import { SetAbsoluteRangeDatePicker } from '../types';
import { DocValueFields } from '../../../common/containers/source';

export type NetworkRoutesProps = GlobalTimeArgs & {
  docValueFields: DocValueFields[];
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
  indexPattern: DataViewBase;
  indexNames: string[];
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
};

export enum NetworkRouteType {
  flows = 'flows',
  dns = 'dns',
  anomalies = 'anomalies',
  tls = 'tls',
  http = 'http',
  alerts = 'external-alerts',
}

export type KeyNetworkNavTabWithoutMlPermission = NetworkRouteType.dns &
  NetworkRouteType.flows &
  NetworkRouteType.http &
  NetworkRouteType.tls &
  NetworkRouteType.alerts;

type KeyNetworkNavTabWithMlPermission = KeyNetworkNavTabWithoutMlPermission &
  NetworkRouteType.anomalies;

type KeyNetworkNavTab = KeyNetworkNavTabWithoutMlPermission | KeyNetworkNavTabWithMlPermission;

export type NetworkNavTab = Record<KeyNetworkNavTab, NavTab>;

export type GetNetworkRoutePath = (
  capabilitiesFetched: boolean,
  hasMlUserPermission: boolean
) => string;

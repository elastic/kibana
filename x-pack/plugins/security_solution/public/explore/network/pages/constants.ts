/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NETWORK_PATH } from '../../../../common/constants';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { NetworkDetailsRouteType } from './details/types';
import { NetworkRouteType } from './navigation/types';

const NETWORK_TABS = [
  NetworkRouteType.flows,
  NetworkRouteType.dns,
  NetworkRouteType.http,
  NetworkRouteType.tls,
  NetworkRouteType.events,
];

const NETWORK_WITHOUT_ANOMALIES_TAB_PARAM = NETWORK_TABS.join('|');
const NETWORK_WITH_ANOMALIES_TAB_PARAM = [...NETWORK_TABS, NetworkRouteType.anomalies].join('|');

export const NETWORK_PATH_WITH_ANOMALIES = `${NETWORK_PATH}/:tabName(${NETWORK_WITH_ANOMALIES_TAB_PARAM})`;
export const NETWORK_PATH_WITHOUT_ANOMALIES = `${NETWORK_PATH}/:tabName(${NETWORK_WITHOUT_ANOMALIES_TAB_PARAM})`;

const DETAIL_TABS_PARAM = [
  NetworkDetailsRouteType.flows,
  NetworkDetailsRouteType.http,
  NetworkDetailsRouteType.tls,
  NetworkDetailsRouteType.anomalies,
  NetworkDetailsRouteType.events,
  NetworkDetailsRouteType.users,
].join('|');

export const FLOW_TARGET_PARAM = [
  FlowTargetSourceDest.source,
  FlowTargetSourceDest.destination,
].join('|');

export const NETWORK_DETAILS_PAGE_PATH = `${NETWORK_PATH}/ip/:detailName`;

export const NETWORK_DETAILS_TAB_PATH = `${NETWORK_DETAILS_PAGE_PATH}/:flowTarget(${FLOW_TARGET_PARAM})/:tabName(${DETAIL_TABS_PARAM})`;

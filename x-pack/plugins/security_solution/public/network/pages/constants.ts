/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NETWORK_PATH } from '../../../common/constants';
import { FlowTargetSourceDest } from '../../../common/search_strategy';
import { NetworkDetailsRouteType } from './details/types';
import { NetworkRouteType } from './navigation/types';

export const networkTabPath = `${NETWORK_PATH}/:tabName(${NetworkRouteType.flows}|${NetworkRouteType.http}|${NetworkRouteType.tls}|${NetworkRouteType.anomalies}|${NetworkRouteType.events})`;

export const networkDetailsPagePath = `${NETWORK_PATH}/ip/:detailName`;

export const networkDetailsTabPath = `${networkDetailsPagePath}/:flowTarget(${FlowTargetSourceDest.source}|${FlowTargetSourceDest.destination})/:tabName(${NetworkDetailsRouteType.flows}|${NetworkDetailsRouteType.http}|${NetworkDetailsRouteType.tls}|${NetworkDetailsRouteType.anomalies}|${NetworkDetailsRouteType.events}|${NetworkDetailsRouteType.users})`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NETWORK_PATH } from '../../../common/constants';
import { NetworkDetailsRouteType } from './details/types';

export const networkTabPath = `${NETWORK_PATH}/:tabName(${NetworkDetailsRouteType.flows}|${NetworkDetailsRouteType.http}|${NetworkDetailsRouteType.tls}|${NetworkDetailsRouteType.anomalies}|${NetworkDetailsRouteType.alerts})`;

export const networkDetailsPagePath = `${NETWORK_PATH}/:detailName`;

export const networkDetailsTabPath = `${networkDetailsPagePath}/:tabName(${NetworkDetailsRouteType.flows}|${NetworkDetailsRouteType.http}|${NetworkDetailsRouteType.tls}|${NetworkDetailsRouteType.anomalies}|${NetworkDetailsRouteType.alerts}|${NetworkDetailsRouteType.users})`;

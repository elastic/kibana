/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { networkModel } from '.';
import type { NetworkType } from './model';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/network');

export const updateNetworkTable = actionCreator<{
  networkType: networkModel.NetworkType;
  tableType: networkModel.NetworkTableType | networkModel.NetworkDetailsTableType;
  updates: networkModel.TableUpdates;
}>('UPDATE_NETWORK_TABLE');

export const setNetworkDetailsTablesActivePageToZero = actionCreator(
  'SET_IP_DETAILS_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const setNetworkTablesActivePageToZero = actionCreator(
  'SET_NETWORK_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const updateNetworkAnomaliesJobIdFilter = actionCreator<{
  jobIds: string[];
  networkType: NetworkType;
}>('UPDATE_NETWORK_ANOMALIES_JOB_ID_FILTER');

export const updateNetworkAnomaliesInterval = actionCreator<{
  interval: string;
  networkType: NetworkType;
}>('UPDATE_NETWORK_ANOMALIES_INTERVAL');

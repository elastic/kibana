/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KeyUrlState, LocationKeysType, LocationMappedToModel } from './types';
import { networkModel } from '../../store/network';
import { hostsModel } from '../../store/hosts';

export enum CONSTANTS {
  hostsDetails = 'hosts.details',
  hostsPage = 'hosts.page',
  kqlQuery = 'kqlQuery',
  networkDetails = 'network.details',
  networkPage = 'network.page',
  timerange = 'timerange',
}

export const LOCATION_KEYS: LocationKeysType[] = [
  CONSTANTS.hostsDetails,
  CONSTANTS.hostsPage,
  CONSTANTS.networkDetails,
  CONSTANTS.networkPage,
];

export const URL_STATE_KEYS: KeyUrlState[] = [CONSTANTS.kqlQuery, CONSTANTS.timerange];

export const LOCATION_MAPPED_TO_MODEL: LocationMappedToModel = {
  [CONSTANTS.networkPage]: networkModel.NetworkType.page,
  [CONSTANTS.networkDetails]: networkModel.NetworkType.details,
  [CONSTANTS.hostsPage]: hostsModel.HostsType.page,
  [CONSTANTS.hostsDetails]: hostsModel.HostsType.details,
};

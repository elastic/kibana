/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { ActionCreator } from 'typescript-fsa';
import { History, Location } from 'history';
import { hostsModel, KueryFilterQuery, networkModel, SerializedFilterQuery } from '../../store';
import { CONSTANTS } from './constants';
import { InputsModelId, UrlInputsModel } from '../../store/inputs/model';

export type LocationTypes =
  | CONSTANTS.networkDetails
  | CONSTANTS.networkPage
  | CONSTANTS.hostsDetails
  | CONSTANTS.hostsPage
  | null;

export interface KqlQueryObject {
  [CONSTANTS.networkDetails]: KqlQuery;
  [CONSTANTS.networkPage]: KqlQuery;
  [CONSTANTS.hostsDetails]: KqlQuery;
  [CONSTANTS.hostsPage]: KqlQuery;
  [key: string]: KqlQuery;
}

export interface LocationMappedToModel {
  [CONSTANTS.hostsDetails]: hostsModel.HostsType.details;
  [CONSTANTS.hostsPage]: hostsModel.HostsType.page;
  [CONSTANTS.networkDetails]: networkModel.NetworkType.details;
  [CONSTANTS.networkPage]: networkModel.NetworkType.page;
}

export interface LocationMappedToSelf {
  [CONSTANTS.networkDetails]: string;
  [CONSTANTS.networkPage]: string;
  [CONSTANTS.hostsDetails]: string;
  [CONSTANTS.hostsPage]: string;
}
export type LocationKeysType = keyof LocationMappedToModel;

export interface KqlQueryHosts {
  filterQuery: KueryFilterQuery | null;
  queryLocation: LocationTypes;
  type: hostsModel.HostsType;
}

export interface KqlQueryNetwork {
  filterQuery: KueryFilterQuery | null;
  queryLocation: LocationTypes;
  type: networkModel.NetworkType;
}

export interface KqlQuery {
  filterQuery: KueryFilterQuery | null;
  queryLocation: LocationTypes;
  type: networkModel.NetworkType | hostsModel.HostsType;
}

// export type KqlQuery = KqlQueryHosts | KqlQueryNetwork;

export interface UrlState {
  [CONSTANTS.kqlQuery]: KqlQueryObject;
  [CONSTANTS.timerange]: UrlInputsModel;
}
export type KeyUrlState = keyof UrlState;

export interface UrlStateProps {
  indexPattern: StaticIndexPattern;
  mapToUrlState?: (value: string) => UrlState;
  onChange?: (urlState: UrlState, previousUrlState: UrlState) => void;
  onInitialize?: (urlState: UrlState) => void;
  urlState: UrlState;
}

export interface UrlStateDispatchProps {
  setHostsKql: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    hostsType: hostsModel.HostsType;
  }>;
  setNetworkKql: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    networkType: networkModel.NetworkType;
  }>;
  setAbsoluteTimerange: ActionCreator<{
    from: number;
    fromStr: undefined;
    id: InputsModelId;
    to: number;
    toStr: undefined;
  }>;
  setRelativeTimerange: ActionCreator<{
    from: number;
    fromStr: string;
    id: InputsModelId;
    to: number;
    toStr: string;
  }>;
  toggleTimelineLinkTo: ActionCreator<{
    linkToId: InputsModelId;
  }>;
}

export interface UrlStateRouterProps {
  history: History;
  location: Location;
}

export type UrlStateContainerPropTypes = UrlStateRouterProps &
  UrlStateProps &
  UrlStateDispatchProps;

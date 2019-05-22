/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { ActionCreator } from 'typescript-fsa';
import { History, Location } from 'history';
import {
  hostsModel,
  KueryFilterModel,
  KueryFilterQuery,
  networkModel,
  SerializedFilterQuery,
} from '../../store';
import { CONSTANTS } from './constants';
import { InputsModelId, UrlInputsModel } from '../../store/inputs/model';

export interface KqlQueryHosts {
  filterQuery: KueryFilterQuery | null;
  model: KueryFilterModel.hosts;
  type: hostsModel.HostsType;
}

export interface KqlQueryNetwork {
  filterQuery: KueryFilterQuery | null;
  model: KueryFilterModel.network;
  type: networkModel.NetworkType;
}

export type KqlQuery = KqlQueryHosts | KqlQueryNetwork;

export interface UrlState {
  [CONSTANTS.kqlQuery]: KqlQuery[];
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

export type UrlStateContainerProps = UrlStateProps & UrlStateDispatchProps;

export interface UrlStateRouterProps {
  history: History;
  location: Location;
}

export type UrlStateContainerLifecycleProps = UrlStateRouterProps & UrlStateContainerProps;

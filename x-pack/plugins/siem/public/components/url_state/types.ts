/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { ActionCreator } from 'typescript-fsa';
import { RouteComponentProps } from 'react-router';
import { hostsModel, KueryFilterQuery, networkModel, SerializedFilterQuery } from '../../store';
import { UrlInputsModel } from '../../store/inputs/model';
import { InputsModelId } from '../../store/inputs/constants';
import { CONSTANTS } from './constants';

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

export type LocationTypes =
  | CONSTANTS.networkDetails
  | CONSTANTS.networkPage
  | CONSTANTS.hostsDetails
  | CONSTANTS.hostsPage
  | null;

export type LocationTypesNoNull =
  | CONSTANTS.networkDetails
  | CONSTANTS.networkPage
  | CONSTANTS.hostsDetails
  | CONSTANTS.hostsPage;

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
  [key: string]:
    | networkModel.NetworkType.page
    | networkModel.NetworkType.details
    | hostsModel.HostsType.details
    | hostsModel.HostsType.page;
}

export type LocationKeysType = keyof LocationMappedToModel;

export interface KqlQuery {
  filterQuery: KueryFilterQuery | null;
  queryLocation: LocationTypes;
  type: networkModel.NetworkType | hostsModel.HostsType;
}

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
}

export interface UrlStateStateToPropsType {
  urlState: UrlState;
}

export interface UrlStateDispatchToPropsType {
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

export type UrlStateContainerPropTypes = RouteComponentProps &
  UrlStateStateToPropsType &
  UrlStateDispatchToPropsType &
  UrlStateProps;

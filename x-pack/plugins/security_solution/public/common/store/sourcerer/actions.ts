/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { TimelineEventsType } from '../../../../common/types/timeline';

import { SourcererDataView, ManageScope, SourcererScopeName } from './model';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/sourcerer');

export const setSource = actionCreator<{
  dataView: {
    browserFields: SourcererDataView['browserFields'];
    docValueFields: SourcererDataView['docValueFields'];
    id: SourcererDataView['id'];
    indexPattern: SourcererDataView['indexPattern'];
    runtimeMappings: SourcererDataView['runtimeMappings'];
  };
  scope: {
    id: ManageScope['id'];
    loading: ManageScope['loading'];
    indicesExist: ManageScope['indicesExist'];
  };
}>('SET_SOURCE');

export const setSignalIndexName =
  actionCreator<{ signalIndexName: string }>('SET_SIGNAL_INDEX_NAME');

export const setSourcererDataViews = actionCreator<{
  defaultDataView: SourcererDataView;
  kibanaDataViews: SourcererDataView[];
}>('SET_SOURCERER_DATA_VIEWS');

export const setSourcererScopeLoading = actionCreator<{
  id?: SourcererScopeName;
  loading: boolean;
}>('SET_SOURCERER_SCOPE_LOADING');

export interface SelectedDataViewPayload {
  id: SourcererScopeName;
  selectedDataViewId: string;
  selectedPatterns?: string[];
  eventType?: TimelineEventsType;
}
export const setSelectedDataView = actionCreator<SelectedDataViewPayload>('SET_SELECTED_DATA_VIEW');

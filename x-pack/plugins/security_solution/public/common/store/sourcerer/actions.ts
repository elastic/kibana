/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';

import { KibanaDataView, SelectedDataView, SourcererDataView, SourcererScopeName } from './model';
import { SecurityDataView } from '../../containers/sourcerer/api';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/sourcerer');

export const setDataView = actionCreator<{
  browserFields: SourcererDataView['browserFields'];
  docValueFields: SourcererDataView['docValueFields'];
  id: SourcererDataView['id'];
  indexFields: SourcererDataView['indexFields'];
  loading: SourcererDataView['loading'];
  runtimeMappings: SourcererDataView['runtimeMappings'];
}>('SET_DATA_VIEW');

export const setDataViewLoading = actionCreator<{
  id: string;
  loading: boolean;
}>('SET_DATA_VIEW_LOADING');

export const setSignalIndexName = actionCreator<{ signalIndexName: string }>(
  'SET_SIGNAL_INDEX_NAME'
);

export const setSourcererDataViews = actionCreator<SecurityDataView>('SET_SOURCERER_DATA_VIEWS');

export const setSourcererScopeLoading = actionCreator<{
  id?: SourcererScopeName;
  loading: boolean;
}>('SET_SOURCERER_SCOPE_LOADING');

export interface SelectedDataViewPayload {
  id: SourcererScopeName;
  selectedDataViewId: SelectedDataView['dataViewId'];
  selectedPatterns: SelectedDataView['selectedPatterns'];
  shouldValidateSelectedPatterns?: boolean;
}
export const setSelectedDataView = actionCreator<SelectedDataViewPayload>('SET_SELECTED_DATA_VIEW');

export const updateSourcererDataViews = actionCreator<{
  dataView: KibanaDataView;
}>('UPDATE_SOURCERER_DATA_VIEWS');

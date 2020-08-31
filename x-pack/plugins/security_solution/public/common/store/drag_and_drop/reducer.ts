/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';

import { registerProvider, unRegisterProvider } from './actions';
import { DragAndDropModel, IdToDataProvider } from './model';

export type DragAndDropState = DragAndDropModel;

export const initialDragAndDropState: DragAndDropState = { dataProviders: {} };

interface RegisterProviderHandlerParams {
  provider: DataProvider;
  dataProviders: IdToDataProvider;
}

export const registerProviderHandler = ({
  provider,
  dataProviders,
}: RegisterProviderHandlerParams): IdToDataProvider => ({
  ...dataProviders,
  [provider.id]: provider,
});

interface UnRegisterProviderHandlerParams {
  id: string;
  dataProviders: IdToDataProvider;
}

export const unRegisterProviderHandler = ({
  id,
  dataProviders,
}: UnRegisterProviderHandlerParams): IdToDataProvider => omit(id, dataProviders);

export const dragAndDropReducer = reducerWithInitialState(initialDragAndDropState)
  .case(registerProvider, (state, { provider }) => ({
    ...state,
    dataProviders: registerProviderHandler({ provider, dataProviders: state.dataProviders }),
  }))
  .case(unRegisterProvider, (state, { id }) => ({
    ...state,
    dataProviders: unRegisterProviderHandler({ id, dataProviders: state.dataProviders }),
  }))
  .build();

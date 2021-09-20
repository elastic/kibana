/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { HostIsolationExceptionsPageState } from '../types';
import { Immutable } from '../../../../../common/endpoint/types';
import { getLastLoadedResourceState } from '../../../state/async_resource_state';

type StoreState = Immutable<HostIsolationExceptionsPageState>;
type HostIsolationExceptionsSelector<T> = (state: StoreState) => T;

export const getCurrentListPageState: HostIsolationExceptionsSelector<StoreState> = (state) => {
  return state;
};

export const getCurrentListPageDataState: HostIsolationExceptionsSelector<StoreState['entries']> = (
  state
) => state.entries;

const getListApiSuccessResponse: HostIsolationExceptionsSelector<
  Immutable<FoundExceptionListItemSchema> | undefined
> = createSelector(getCurrentListPageDataState, (listPageData) => {
  return getLastLoadedResourceState(listPageData)?.data;
});

export const getListItems: HostIsolationExceptionsSelector<Immutable<ExceptionListItemSchema[]>> =
  createSelector(getListApiSuccessResponse, (apiResponseData) => {
    return apiResponseData?.data || [];
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Immutable } from '../../../../../common/endpoint/types';
(??)import { ServerApiError } from '../../../../common/types';
(??)import {
(??)  MANAGEMENT_DEFAULT_PAGE_SIZE,
(??)  MANAGEMENT_PAGE_SIZE_OPTIONS,
(??)} from '../../../common/constants';
(??)import {
(??)  getLastLoadedResourceState,
(??)  isFailedResourceState,
(??)  isLoadedResourceState,
(??)  isLoadingResourceState,
(??)} from '../../../state/async_resource_state';
import { HostIsolationExceptionsPageState } from '../types';

type StoreState = Immutable<HostIsolationExceptionsPageState>;
type HostIsolationExceptionsSelector<T> = (state: StoreState) => T;

export const getCurrentLocation: HostIsolationExceptionsSelector<StoreState['location']> = (
  state
) => state.location;

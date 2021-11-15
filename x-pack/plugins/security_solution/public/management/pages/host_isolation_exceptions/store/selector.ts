/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { createSelector } from 'reselect';
import { Immutable } from '../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../common/types';
import { isFailedResourceState } from '../../../state/async_resource_state';
import { HostIsolationExceptionsPageState } from '../types';

type StoreState = Immutable<HostIsolationExceptionsPageState>;
type HostIsolationExceptionsSelector<T> = (state: StoreState) => T;

export const getCurrentLocation: HostIsolationExceptionsSelector<StoreState['location']> = (
  state
) => state.location;

const getFormState: HostIsolationExceptionsSelector<StoreState['form']> = (state) => {
  return state.form;
};

export const getFormStatusFailure: HostIsolationExceptionsSelector<ServerApiError | undefined> =
  createSelector(getFormState, (form) => {
    if (isFailedResourceState(form.status)) {
      return form.status.error;
    }
  });

export const getExceptionToEdit: HostIsolationExceptionsSelector<
  UpdateExceptionListItemSchema | undefined
> = (state) => (state.form.entry ? (state.form.entry as UpdateExceptionListItemSchema) : undefined);

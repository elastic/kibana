/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { CoreStart, HttpSetup, HttpStart } from 'kibana/public';
import { transformNewItemOutput, transformOutput } from '@kbn/securitysolution-list-hooks';
import { ImmutableObject } from '../../../../../common/endpoint/types';
import { ImmutableMiddleware, ImmutableMiddlewareAPI } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import {
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
} from '../../../state/async_resource_builders';
import {
  createHostIsolationExceptionItem,
  getOneHostIsolationExceptionItem,
  updateOneHostIsolationExceptionItem,
} from '../service';
import { HostIsolationExceptionsPageState } from '../types';
import { HostIsolationExceptionsPageAction } from './action';

export const SEARCHABLE_FIELDS: Readonly<string[]> = [`name`, `description`, `entries.value`];

export function hostIsolationExceptionsMiddlewareFactory(coreStart: CoreStart) {
  return createHostIsolationExceptionsPageMiddleware(coreStart);
}

export const createHostIsolationExceptionsPageMiddleware = (
  coreStart: CoreStart
): ImmutableMiddleware<HostIsolationExceptionsPageState, AppAction> => {
  return (store) => (next) => async (action) => {
    next(action);

    if (action.type === 'hostIsolationExceptionsCreateEntry') {
      createHostIsolationException(store, coreStart.http);
    }

    if (action.type === 'hostIsolationExceptionsMarkToEdit') {
      loadHostIsolationExceptionsItem(store, coreStart.http, action.payload.id);
    }

    if (action.type === 'hostIsolationExceptionsSubmitEdit') {
      updateHostIsolationExceptionsItem(store, coreStart.http, action.payload);
    }
  };
};

async function createHostIsolationException(
  store: ImmutableMiddlewareAPI<
    HostIsolationExceptionsPageState,
    HostIsolationExceptionsPageAction
  >,
  http: HttpStart
) {
  const { dispatch } = store;
  const entry = transformNewItemOutput(
    store.getState().form.entry as CreateExceptionListItemSchema
  );

  dispatch({
    type: 'hostIsolationExceptionsFormStateChanged',
    payload: {
      type: 'LoadingResourceState',
    },
  });
  try {
    const response = await createHostIsolationExceptionItem({
      http,
      exception: entry,
    });
    dispatch({
      type: 'hostIsolationExceptionsFormStateChanged',
      payload: createLoadedResourceState(response),
    });
  } catch (error) {
    dispatch({
      type: 'hostIsolationExceptionsFormStateChanged',
      payload: createFailedResourceState<ExceptionListItemSchema>(error.body ?? error),
    });
  }
}

async function loadHostIsolationExceptionsItem(
  store: ImmutableMiddlewareAPI<
    HostIsolationExceptionsPageState,
    HostIsolationExceptionsPageAction
  >,
  http: HttpSetup,
  id: string
) {
  const { dispatch } = store;
  try {
    const exception: UpdateExceptionListItemSchema = await getOneHostIsolationExceptionItem(
      http,
      id
    );
    dispatch({
      type: 'hostIsolationExceptionsFormEntryChanged',
      payload: exception,
    });
  } catch (error) {
    dispatch({
      type: 'hostIsolationExceptionsFormStateChanged',
      payload: createFailedResourceState<ExceptionListItemSchema>(error.body ?? error),
    });
  }
}
async function updateHostIsolationExceptionsItem(
  store: ImmutableMiddlewareAPI<
    HostIsolationExceptionsPageState,
    HostIsolationExceptionsPageAction
  >,
  http: HttpSetup,
  exception: ImmutableObject<UpdateExceptionListItemSchema>
) {
  const { dispatch } = store;
  dispatch({
    type: 'hostIsolationExceptionsFormStateChanged',
    payload: createLoadingResourceState(createLoadedResourceState(exception)),
  });

  try {
    const entry = transformOutput(exception as UpdateExceptionListItemSchema);
    // Clean unnecessary fields for update action
    const fieldsToRemove: Array<keyof ExceptionListItemSchema> = [
      'created_at',
      'created_by',
      'created_at',
      'created_by',
      'list_id',
      'tie_breaker_id',
      'updated_at',
      'updated_by',
    ];

    fieldsToRemove.forEach((field) => {
      delete entry[field as keyof UpdateExceptionListItemSchema];
    });
    const response: ExceptionListItemSchema = await updateOneHostIsolationExceptionItem(
      http,
      entry
    );

    // notify the update was correct
    dispatch({
      type: 'hostIsolationExceptionsFormStateChanged',
      payload: createLoadedResourceState(response),
    });

    // clear the form
    dispatch({
      type: 'hostIsolationExceptionsFormEntryChanged',
      payload: undefined,
    });
  } catch (error) {
    dispatch({
      type: 'hostIsolationExceptionsFormStateChanged',
      payload: createFailedResourceState<ExceptionListItemSchema>(error.body ?? error),
    });
  }
}

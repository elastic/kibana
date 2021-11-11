/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { CoreStart, HttpSetup, HttpStart } from 'kibana/public';
import { matchPath } from 'react-router-dom';
import { transformNewItemOutput, transformOutput } from '@kbn/securitysolution-list-hooks';
import { AppLocation, Immutable, ImmutableObject } from '../../../../../common/endpoint/types';
import { ImmutableMiddleware, ImmutableMiddlewareAPI } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../common/constants';
import { parseQueryFilterToKQL } from '../../../common/utils';
import {
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
  asStaleResourceState,
} from '../../../state/async_resource_builders';
import {
  getHostIsolationExceptionItems,
  createHostIsolationExceptionItem,
  getOneHostIsolationExceptionItem,
  updateOneHostIsolationExceptionItem,
} from '../service';
import { HostIsolationExceptionsPageState } from '../types';
import { getCurrentListPageDataState, getCurrentLocation } from './selector';
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

    if (action.type === 'userChangedUrl' && isHostIsolationExceptionsPage(action.payload)) {
      loadHostIsolationExceptionsList(store, coreStart.http);
    }

    if (action.type === 'hostIsolationExceptionsRefreshList') {
      loadHostIsolationExceptionsList(store, coreStart.http);
    }

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

async function loadHostIsolationExceptionsList(
  store: ImmutableMiddlewareAPI<
    HostIsolationExceptionsPageState,
    HostIsolationExceptionsPageAction
  >,
  http: HttpStart
) {
  const { dispatch } = store;
  try {
    const {
      page_size: pageSize,
      page_index: pageIndex,
      filter,
    } = getCurrentLocation(store.getState());
    const query = {
      http,
      page: pageIndex + 1,
      perPage: pageSize,
      filter: parseQueryFilterToKQL(filter, SEARCHABLE_FIELDS) || undefined,
    };

    dispatch({
      type: 'hostIsolationExceptionsPageDataChanged',
      payload: createLoadingResourceState(
        asStaleResourceState(getCurrentListPageDataState(store.getState()))
      ),
    });

    const entries = await getHostIsolationExceptionItems(query);

    dispatch({
      type: 'hostIsolationExceptionsPageDataChanged',
      payload: createLoadedResourceState(entries),
    });
  } catch (error) {
    dispatch({
      type: 'hostIsolationExceptionsPageDataChanged',
      payload: createFailedResourceState<FoundExceptionListItemSchema>(error.body ?? error),
    });
  }
}

function isHostIsolationExceptionsPage(location: Immutable<AppLocation>) {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
      exact: true,
    }) !== null
  );
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

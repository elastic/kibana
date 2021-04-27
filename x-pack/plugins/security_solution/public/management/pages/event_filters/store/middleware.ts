/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppAction } from '../../../../common/store/actions';
import {
  ImmutableMiddleware,
  ImmutableMiddlewareAPI,
  ImmutableMiddlewareFactory,
} from '../../../../common/store';

import { EventFiltersHttpService, EventFiltersService } from '../service';

import { EventFiltersListPageState } from '../state';
import { getLastLoadedResourceState } from '../../../state/async_resource_state';
import { CreateExceptionListItemSchema, transformNewItemOutput } from '../../../../shared_imports';
import {
  getCurrentListPageState,
  getListIsLoading,
  getListPagination,
  listDataNeedsRefresh,
} from './selector';

type MiddlewareActionHandler = (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  eventFiltersService: EventFiltersService
) => Promise<void>;

const eventFiltersCreate: MiddlewareActionHandler = async (store, eventFiltersService) => {
  const submissionResourceState = store.getState().form.submissionResourceState;
  try {
    const formEntry = store.getState().form.entry;
    if (!formEntry) return;
    store.dispatch({
      type: 'eventFiltersFormStateChanged',
      payload: {
        type: 'LoadingResourceState',
        previousState: { type: 'UninitialisedResourceState' },
      },
    });

    const sanitizedEntry = transformNewItemOutput(formEntry as CreateExceptionListItemSchema);

    const exception = await eventFiltersService.addEventFilters(sanitizedEntry);
    store.dispatch({
      type: 'eventFiltersFormStateChanged',
      payload: {
        type: 'LoadedResourceState',
        data: exception,
      },
    });
  } catch (error) {
    store.dispatch({
      type: 'eventFiltersFormStateChanged',
      payload: {
        type: 'FailedResourceState',
        error: error.body || error,
        lastLoadedState: getLastLoadedResourceState(submissionResourceState),
      },
    });
  }
};

const refreshListDataIfNeeded: MiddlewareActionHandler = async (
  { dispatch, getState },
  eventFiltersService
) => {
  const state = getState();
  const isLoading = getListIsLoading(state);

  if (!isLoading && listDataNeedsRefresh(state)) {
    dispatch({
      type: 'eventFiltersListPageStateChanged',
      payload: {
        type: 'LoadingResourceState',
        // Ignore will be fixed with when AsyncResourceState is refactored (#830)
        // @ts-ignore
        previousState: getCurrentListPageState(state),
      },
    });

    const { pageIndex, pageSize } = getListPagination(state);

    try {
      const results = await eventFiltersService.getList({
        page: pageIndex + 1,
        perPage: pageSize,
        sortField: 'created_at',
        sortOrder: 'desc',
      });

      dispatch({
        type: 'eventFiltersListPageStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: results,
        },
      });
    } catch (error) {
      dispatch({
        type: 'eventFiltersListPageStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: error.body || error,
        },
      });
    }
  }
};

export const createEventFiltersPageMiddleware = (
  eventFiltersService: EventFiltersService
): ImmutableMiddleware<EventFiltersListPageState, AppAction> => {
  return (store) => (next) => async (action) => {
    next(action);

    if (action.type === 'eventFiltersCreateStart') {
      await eventFiltersCreate(store, eventFiltersService);
    }

    // FIXME:PT ensure user is on event filters list
    if (action.type === 'userChangedUrl') {
      refreshListDataIfNeeded(store, eventFiltersService);
    }
  };
};

export const eventFiltersPageMiddlewareFactory: ImmutableMiddlewareFactory<EventFiltersListPageState> = (
  coreStart
) => createEventFiltersPageMiddleware(new EventFiltersHttpService(coreStart.http));

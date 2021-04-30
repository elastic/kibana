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

import { EventFiltersHttpService } from '../service';

import { EventFiltersListPageState } from '../state';
import { getLastLoadedResourceState } from '../../../state/async_resource_state';
import { CreateExceptionListItemSchema, transformNewItemOutput } from '../../../../shared_imports';
import {
  getCurrentListPageDataState,
  getCurrentLocation,
  getListIsLoading,
  getListPageDataExistsState,
  getListPageIsActive,
  listDataNeedsRefresh,
} from './selector';
import { EventFiltersService, EventFiltersServiceGetListOptions } from '../types';

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
      type: 'eventFiltersCreateSuccess',
      payload: {
        exception,
      },
    });
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

const checkIfEventFilterDataExist: MiddlewareActionHandler = async (
  { dispatch, getState },
  eventFiltersService: EventFiltersService
) => {
  dispatch({
    type: 'eventFiltersListPageDataExistsChanged',
    payload: {
      type: 'LoadingResourceState',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-ignore
      previousState: getListPageDataExistsState(getState()),
    },
  });

  try {
    const anythingInListResults = await eventFiltersService.getList({ perPage: 1, page: 1 });

    dispatch({
      type: 'eventFiltersListPageDataExistsChanged',
      payload: {
        type: 'LoadedResourceState',
        data: Boolean(anythingInListResults.total),
      },
    });
  } catch (error) {
    dispatch({
      type: 'eventFiltersListPageDataExistsChanged',
      payload: {
        type: 'FailedResourceState',
        error: error.body || error,
      },
    });
  }
};

const refreshListDataIfNeeded: MiddlewareActionHandler = async (store, eventFiltersService) => {
  const { dispatch, getState } = store;
  const state = getState();
  const isLoading = getListIsLoading(state);

  if (!isLoading && listDataNeedsRefresh(state)) {
    dispatch({
      type: 'eventFiltersListPageDataChanged',
      payload: {
        type: 'LoadingResourceState',
        // Ignore will be fixed with when AsyncResourceState is refactored (#830)
        // @ts-ignore
        previousState: getCurrentListPageDataState(state),
      },
    });

    const { page_size: pageSize, page_index: pageIndex } = getCurrentLocation(state);
    const query: EventFiltersServiceGetListOptions = {
      page: pageIndex + 1,
      perPage: pageSize,
      sortField: 'created_at',
      sortOrder: 'desc',
    };

    try {
      const results = await eventFiltersService.getList(query);

      dispatch({
        type: 'eventFiltersListPageDataChanged',
        payload: {
          type: 'LoadedResourceState',
          data: {
            query,
            content: results,
          },
        },
      });

      // If no results were returned, then just check to make sure data actually exists for
      // event filters. This is used to drive the UI between showing "empty state" and "no items found"
      // messages to the user
      if (results.total === 0) {
        await checkIfEventFilterDataExist(store, eventFiltersService);
      }
    } catch (error) {
      dispatch({
        type: 'eventFiltersListPageDataChanged',
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

    // Middleware that only applies to the List Page for Event Filters
    if (getListPageIsActive(store.getState())) {
      if (action.type === 'userChangedUrl' || action.type === 'eventFiltersCreateSuccess') {
        refreshListDataIfNeeded(store, eventFiltersService);
      }
    }
  };
};

export const eventFiltersPageMiddlewareFactory: ImmutableMiddlewareFactory<EventFiltersListPageState> = (
  coreStart
) => createEventFiltersPageMiddleware(new EventFiltersHttpService(coreStart.http));

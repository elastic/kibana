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

import { getLastLoadedResourceState } from '../../../state/async_resource_state';

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  transformNewItemOutput,
  transformOutput,
  UpdateExceptionListItemSchema,
} from '../../../../shared_imports';
import {
  getCurrentListPageDataState,
  getCurrentLocation,
  getListIsLoading,
  getListPageDataExistsState,
  getListPageIsActive,
  listDataNeedsRefresh,
  getFormEntry,
  getSubmissionResource,
  getNewComment,
} from './selector';
import {
  EventFiltersListPageData,
  EventFiltersListPageState,
  EventFiltersService,
  EventFiltersServiceGetListOptions,
} from '../types';
import {
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
} from '../../../state';

const addNewComments = (
  entry: UpdateExceptionListItemSchema | CreateExceptionListItemSchema,
  newComment: string
): UpdateExceptionListItemSchema | CreateExceptionListItemSchema => {
  if (newComment) {
    if (!entry.comments) entry.comments = [];
    entry.comments.push({ comment: newComment });
  }
  return entry;
};

type MiddlewareActionHandler = (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  eventFiltersService: EventFiltersService
) => Promise<void>;

const eventFiltersCreate: MiddlewareActionHandler = async (store, eventFiltersService) => {
  const submissionResourceState = store.getState().form.submissionResourceState;
  try {
    const formEntry = getFormEntry(store.getState());
    if (!formEntry) return;
    store.dispatch({
      type: 'eventFiltersFormStateChanged',
      payload: createLoadingResourceState<ExceptionListItemSchema>({
        type: 'UninitialisedResourceState',
      }),
    });

    const sanitizedEntry = transformNewItemOutput(formEntry as CreateExceptionListItemSchema);
    const updatedCommentsEntry = addNewComments(
      sanitizedEntry,
      getNewComment(store.getState())
    ) as CreateExceptionListItemSchema;

    const exception = await eventFiltersService.addEventFilters(updatedCommentsEntry);

    store.dispatch({
      type: 'eventFiltersCreateSuccess',
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

const eventFiltersUpdate = async (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  eventFiltersService: EventFiltersService
) => {
  const submissionResourceState = getSubmissionResource(store.getState());
  try {
    const formEntry = getFormEntry(store.getState());
    if (!formEntry) return;
    store.dispatch({
      type: 'eventFiltersFormStateChanged',
      payload: {
        type: 'LoadingResourceState',
        previousState: { type: 'UninitialisedResourceState' },
      },
    });

    const sanitizedEntry: UpdateExceptionListItemSchema = transformOutput(
      formEntry as UpdateExceptionListItemSchema
    );
    const updatedCommentsEntry = addNewComments(
      sanitizedEntry,
      getNewComment(store.getState())
    ) as UpdateExceptionListItemSchema;

    // Clean unnecessary fields for update action
    [
      'created_at',
      'created_by',
      'created_at',
      'created_by',
      'list_id',
      'tie_breaker_id',
      'updated_at',
      'updated_by',
    ].forEach((field) => {
      delete updatedCommentsEntry[field as keyof UpdateExceptionListItemSchema];
    });

    updatedCommentsEntry.comments = updatedCommentsEntry.comments?.map((comment) => ({
      comment: comment.comment,
      id: comment.id,
    }));

    const exception = await eventFiltersService.updateOne(updatedCommentsEntry);
    store.dispatch({
      type: 'eventFiltersUpdateSuccess',
    });
    store.dispatch({
      type: 'eventFiltersFormStateChanged',
      payload: createLoadedResourceState(exception),
    });
  } catch (error) {
    store.dispatch({
      type: 'eventFiltersFormStateChanged',
      payload: createFailedResourceState(
        error.body ?? error,
        getLastLoadedResourceState(submissionResourceState)
      ),
    });
  }
};

const eventFiltersLoadById = async (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  eventFiltersService: EventFiltersService,
  id: string
) => {
  const submissionResourceState = getSubmissionResource(store.getState());
  try {
    const entry = await eventFiltersService.getOne(id);
    store.dispatch({
      type: 'eventFiltersInitForm',
      payload: { entry },
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
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-ignore
    payload: createLoadingResourceState(getListPageDataExistsState(getState())),
  });

  try {
    const anythingInListResults = await eventFiltersService.getList({ perPage: 1, page: 1 });

    dispatch({
      type: 'eventFiltersListPageDataExistsChanged',
      payload: createLoadedResourceState(Boolean(anythingInListResults.total)),
    });
  } catch (error) {
    dispatch({
      type: 'eventFiltersListPageDataExistsChanged',
      payload: createFailedResourceState<boolean>(error.body ?? error),
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
        payload: createLoadedResourceState({
          query,
          content: results,
        }),
      });

      dispatch({
        type: 'eventFiltersListPageDataExistsChanged',
        payload: {
          type: 'LoadedResourceState',
          data: Boolean(results.total),
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
        payload: createFailedResourceState<EventFiltersListPageData>(error.body ?? error),
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
    } else if (action.type === 'eventFiltersInitFromId') {
      await eventFiltersLoadById(store, eventFiltersService, action.payload.id);
    } else if (action.type === 'eventFiltersUpdateStart') {
      await eventFiltersUpdate(store, eventFiltersService);
    }

    // Middleware that only applies to the List Page for Event Filters
    if (getListPageIsActive(store.getState())) {
      if (
        action.type === 'userChangedUrl' ||
        action.type === 'eventFiltersCreateSuccess' ||
        action.type === 'eventFiltersUpdateSuccess'
      ) {
        refreshListDataIfNeeded(store, eventFiltersService);
      }
    }
  };
};

export const eventFiltersPageMiddlewareFactory: ImmutableMiddlewareFactory<EventFiltersListPageState> = (
  coreStart
) => createEventFiltersPageMiddleware(new EventFiltersHttpService(coreStart.http));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { transformNewItemOutput, transformOutput } from '@kbn/securitysolution-list-hooks';
import { AppAction } from '../../../../common/store/actions';
import {
  ImmutableMiddleware,
  ImmutableMiddlewareAPI,
  ImmutableMiddlewareFactory,
} from '../../../../common/store';

import { EventFiltersHttpService } from '../service';

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
  isDeletionInProgress,
  getItemToDelete,
  getDeletionState,
} from './selector';

import { parseQueryFilterToKQL, parsePoliciesAndFilterToKql } from '../../../common/utils';
import { SEARCHABLE_FIELDS } from '../constants';
import {
  EventFiltersListPageData,
  EventFiltersListPageState,
  EventFiltersService,
  EventFiltersServiceGetListOptions,
} from '../types';
import {
  asStaleResourceState,
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
  getLastLoadedResourceState,
} from '../../../state';
import { ServerApiError } from '../../../../common/types';

const addNewComments = (
  entry: UpdateExceptionListItemSchema | CreateExceptionListItemSchema,
  newComment: string
): UpdateExceptionListItemSchema | CreateExceptionListItemSchema => {
  if (newComment) {
    if (!entry.comments) entry.comments = [];
    const trimmedComment = newComment.trim();
    if (trimmedComment) entry.comments.push({ comment: trimmedComment });
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
    payload: createLoadingResourceState(
      asStaleResourceState(getListPageDataExistsState(getState()))
    ),
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
        previousState: asStaleResourceState(getCurrentListPageDataState(state)),
      },
    });

    const {
      page_size: pageSize,
      page_index: pageIndex,
      filter,
      included_policies: includedPolicies,
    } = getCurrentLocation(state);

    const kuery = parseQueryFilterToKQL(filter, SEARCHABLE_FIELDS) || undefined;

    const query: EventFiltersServiceGetListOptions = {
      page: pageIndex + 1,
      perPage: pageSize,
      sortField: 'created_at',
      sortOrder: 'desc',
      filter: parsePoliciesAndFilterToKql({
        kuery,
        policies: includedPolicies ? includedPolicies.split(',') : [],
      }),
    };

    try {
      const results = await eventFiltersService.getList(query);

      dispatch({
        type: 'eventFiltersListPageDataChanged',
        payload: createLoadedResourceState({
          query: { ...query, filter },
          content: results,
        }),
      });

      // If no results were returned, then just check to make sure data actually exists for
      // event filters. This is used to drive the UI between showing "empty state" and "no items found"
      // messages to the user
      if (results.total === 0) {
        await checkIfEventFilterDataExist(store, eventFiltersService);
      } else {
        dispatch({
          type: 'eventFiltersListPageDataExistsChanged',
          payload: {
            type: 'LoadedResourceState',
            data: Boolean(results.total),
          },
        });
      }
    } catch (error) {
      dispatch({
        type: 'eventFiltersListPageDataChanged',
        payload: createFailedResourceState<EventFiltersListPageData>(error.body ?? error),
      });
    }
  }
};

const eventFilterDeleteEntry: MiddlewareActionHandler = async (
  { getState, dispatch },
  eventFiltersService
) => {
  const state = getState();

  if (isDeletionInProgress(state)) {
    return;
  }

  const itemId = getItemToDelete(state)?.id;

  if (!itemId) {
    return;
  }

  dispatch({
    type: 'eventFilterDeleteStatusChanged',
    payload: createLoadingResourceState(asStaleResourceState(getDeletionState(state).status)),
  });

  try {
    const response = await eventFiltersService.deleteOne(itemId);
    dispatch({
      type: 'eventFilterDeleteStatusChanged',
      payload: createLoadedResourceState(response),
    });
  } catch (e) {
    dispatch({
      type: 'eventFilterDeleteStatusChanged',
      payload: createFailedResourceState<ExceptionListItemSchema, ServerApiError>(e.body ?? e),
    });
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
        action.type === 'eventFiltersUpdateSuccess' ||
        action.type === 'eventFilterDeleteStatusChanged'
      ) {
        refreshListDataIfNeeded(store, eventFiltersService);
      } else if (action.type === 'eventFilterDeleteSubmit') {
        eventFilterDeleteEntry(store, eventFiltersService);
      }
    }
  };
};

export const eventFiltersPageMiddlewareFactory: ImmutableMiddlewareFactory<
  EventFiltersListPageState
> = (coreStart) => createEventFiltersPageMiddleware(new EventFiltersHttpService(coreStart.http));

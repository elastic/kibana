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

import { EventFiltersListPageState } from '../types';
import { getLastLoadedResourceState } from '../../../state/async_resource_state';
import {
  CreateExceptionListItemSchema,
  transformNewItemOutput,
  transformOutput,
  UpdateExceptionListItemSchema,
} from '../../../../shared_imports';
import { getFormEntry, getSubmissionResource, getNewComment } from './selector';

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

const eventFiltersCreate = async (
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

    const sanitizedEntry = transformNewItemOutput(formEntry as CreateExceptionListItemSchema);
    const updatedCommentsEntry = addNewComments(
      sanitizedEntry,
      getNewComment(store.getState())
    ) as CreateExceptionListItemSchema;

    const exception = await eventFiltersService.addEventFilters(updatedCommentsEntry);
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

const eventFiltersLoadById = async (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  eventFiltersService: EventFiltersService,
  id: string
) => {
  const submissionResourceState = getSubmissionResource(store.getState());
  try {
    // TODO: Try to get the entry from the list before perform API call
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
  };
};

export const eventFiltersPageMiddlewareFactory: ImmutableMiddlewareFactory<EventFiltersListPageState> = (
  coreStart
) => createEventFiltersPageMiddleware(new EventFiltersHttpService(coreStart.http));

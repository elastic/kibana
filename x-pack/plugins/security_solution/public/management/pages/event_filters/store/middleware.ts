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
import { CreateExceptionListItemSchema, transformNewItemOutput } from '../../../../shared_imports';

const eventFiltersCreate = async (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  eventFiltersService: EventFiltersService
) => {
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
    if (store.getState().form.newComment) {
      if (!sanitizedEntry.comments) sanitizedEntry.comments = [];
      sanitizedEntry.comments.push({ comment: store.getState().form.newComment });
    }

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

const eventFiltersLoadByid = async (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  eventFiltersService: EventFiltersService,
  id: string
) => {
  const submissionResourceState = store.getState().form.submissionResourceState;
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
    } else if (action.type === 'eventFiltersInitFormFromId') {
      await eventFiltersLoadByid(store, eventFiltersService, action.payload.id);
    }
  };
};

export const eventFiltersPageMiddlewareFactory: ImmutableMiddlewareFactory<EventFiltersListPageState> = (
  coreStart
) => createEventFiltersPageMiddleware(new EventFiltersHttpService(coreStart.http));

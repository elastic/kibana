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

import { EventFilterHttpService, EventFilterService } from '../service';

import { EventFilterListPageState } from '../state';

const eventFilterCreate = async (
  store: ImmutableMiddlewareAPI<EventFilterListPageState, AppAction>,
  eventFilterService: EventFilterService
) => {
  try {
    const formEntry = store.getState().form.entry;
    if (!formEntry) return;
    const exception = await eventFilterService.addEventFilter(formEntry);
    store.dispatch({ type: 'eventFilterCreateSuccess', payload: { exception } });
  } catch (error) {
    store.dispatch({ type: 'eventFilterCreateError' });
  }
};

export const createEventFilterPageMiddleware = (
  eventFilterService: EventFilterService
): ImmutableMiddleware<EventFilterListPageState, AppAction> => {
  return (store) => (next) => async (action) => {
    next(action);

    if (action.type === 'eventFilterCreateStart') {
      await eventFilterCreate(store, eventFilterService);
    }
  };
};

export const eventFilterPageMiddlewareFactory: ImmutableMiddlewareFactory<EventFilterListPageState> = (
  coreStart
) => createEventFilterPageMiddleware(new EventFilterHttpService(coreStart.http));

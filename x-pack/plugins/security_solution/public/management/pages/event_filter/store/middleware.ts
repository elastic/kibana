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
import { Immutable } from '../../../../../common/endpoint/types';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../public/shared_imports';

import { EventFiltersHttpService, EventFiltersService } from '../service';

import { EventFiltersListPageState } from '../state';

const eventFilterCreate = async (
  store: ImmutableMiddlewareAPI<EventFiltersListPageState, AppAction>,
  trustedAppsService: EventFiltersService,
  entry: Immutable<ExceptionListItemSchema | CreateExceptionListItemSchema>
) => {
  try {
    await trustedAppsService.addEventFilter(entry);
  } catch (error) {
    if (error) throw error;
  }
};

export const createEventFiltersPageMiddleware = (
  eventFiltersService: EventFiltersService
): ImmutableMiddleware<EventFiltersListPageState, AppAction> => {
  return (store) => (next) => async (action) => {
    next(action);

    if (action.type === 'eventFilterCreateStart') {
      await eventFilterCreate(store, eventFiltersService, action.payload.entry);
    }
  };
};

export const eventFiltersPageMiddlewareFactory: ImmutableMiddlewareFactory<EventFiltersListPageState> = (
  coreStart
) => createEventFiltersPageMiddleware(new EventFiltersHttpService(coreStart.http));

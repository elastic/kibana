/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { AsyncResourceState } from '../../../state/async_resource_state';
import { EventFiltersListPageState } from '../types';

export type EventFiltersListPageDataChanged = Action<'eventFiltersListPageDataChanged'> & {
  payload: EventFiltersListPageState['listPage']['data'];
};

export type EventFiltersListPageDataExistsChanged =
  Action<'eventFiltersListPageDataExistsChanged'> & {
    payload: EventFiltersListPageState['listPage']['dataExist'];
  };

export type EventFilterForDeletion = Action<'eventFilterForDeletion'> & {
  payload: ExceptionListItemSchema;
};

export type EventFilterDeletionReset = Action<'eventFilterDeletionReset'>;

export type EventFilterDeleteSubmit = Action<'eventFilterDeleteSubmit'>;

export type EventFilterDeleteStatusChanged = Action<'eventFilterDeleteStatusChanged'> & {
  payload: EventFiltersListPageState['listPage']['deletion']['status'];
};

export type EventFiltersInitForm = Action<'eventFiltersInitForm'> & {
  payload: {
    entry: UpdateExceptionListItemSchema | CreateExceptionListItemSchema;
  };
};

export type EventFiltersInitFromId = Action<'eventFiltersInitFromId'> & {
  payload: {
    id: string;
  };
};

export type EventFiltersChangeForm = Action<'eventFiltersChangeForm'> & {
  payload: {
    entry?: UpdateExceptionListItemSchema | CreateExceptionListItemSchema;
    hasNameError?: boolean;
    hasItemsError?: boolean;
    hasOSError?: boolean;
    newComment?: string;
  };
};

export type EventFiltersUpdateStart = Action<'eventFiltersUpdateStart'>;
export type EventFiltersUpdateSuccess = Action<'eventFiltersUpdateSuccess'>;
export type EventFiltersCreateStart = Action<'eventFiltersCreateStart'>;
export type EventFiltersCreateSuccess = Action<'eventFiltersCreateSuccess'>;
export type EventFiltersCreateError = Action<'eventFiltersCreateError'>;

export type EventFiltersFormStateChanged = Action<'eventFiltersFormStateChanged'> & {
  payload: AsyncResourceState<ExceptionListItemSchema>;
};

export type EventFiltersForceRefresh = Action<'eventFiltersForceRefresh'> & {
  payload: {
    forceRefresh: boolean;
  };
};

export type EventFiltersPageAction =
  | EventFiltersListPageDataChanged
  | EventFiltersListPageDataExistsChanged
  | EventFiltersInitForm
  | EventFiltersInitFromId
  | EventFiltersChangeForm
  | EventFiltersUpdateStart
  | EventFiltersUpdateSuccess
  | EventFiltersCreateStart
  | EventFiltersCreateSuccess
  | EventFiltersCreateError
  | EventFiltersFormStateChanged
  | EventFilterForDeletion
  | EventFilterDeletionReset
  | EventFilterDeleteSubmit
  | EventFilterDeleteStatusChanged
  | EventFiltersForceRefresh;

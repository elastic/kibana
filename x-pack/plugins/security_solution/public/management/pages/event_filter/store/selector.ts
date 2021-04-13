/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventFilterListPageState } from '../state';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../public/shared_imports';
import { isLoadingResourceState, isLoadedResourceState } from '../../../state/async_resource_state';

export const getFormEntry = (
  state: EventFilterListPageState
): CreateExceptionListItemSchema | ExceptionListItemSchema | undefined => {
  return state.form.entry;
};

export const getFormHasError = (state: EventFilterListPageState): boolean => {
  return state.form.hasError;
};

export const getFormSubmissionIsLoadingStatus = (state: EventFilterListPageState): boolean => {
  return state.form.submissionResourceState.type === 'LoadingResourceState';
};

export const getFormSubmissionIsUninitialisedStatus = (
  state: EventFilterListPageState
): boolean => {
  return state.form.submissionResourceState.type === 'UninitialisedResourceState';
};

export const getFormSubmissionIsLoadedStatus = (state: EventFilterListPageState): boolean => {
  return state.form.submissionResourceState.type === 'LoadedResourceState';
};

export const isCreationInProgress = (state: EventFilterListPageState): boolean => {
  return isLoadingResourceState(state.form.submissionResourceState);
};

export const isCreationSuccessful = (state: EventFilterListPageState): boolean => {
  return isLoadedResourceState(state.form.submissionResourceState);
};

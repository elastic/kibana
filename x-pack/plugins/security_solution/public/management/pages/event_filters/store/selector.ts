/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from 'reselect';

import { EventFiltersListPageState, EventFiltersPageLocation } from '../types';

import { ServerApiError } from '../../../../common/types';
import {
  isLoadingResourceState,
  isLoadedResourceState,
  isFailedResourceState,
  isUninitialisedResourceState,
} from '../../../state/async_resource_state';
import { Immutable } from '../../../../../common/endpoint/types';

type StoreState = Immutable<EventFiltersListPageState>;
type EventFiltersSelector<T> = (state: StoreState) => T;

export const getFormEntryState: EventFiltersSelector<StoreState['form']['entry']> = (state) => {
  return state.form.entry;
};

export const getFormEntryStateMutable = (
  state: EventFiltersListPageState
): EventFiltersListPageState['form']['entry'] => {
  return state.form.entry;
};

export const getFormEntry = createSelector(getFormEntryState, (entry) => entry);

export const getNewCommentState: EventFiltersSelector<StoreState['form']['newComment']> = (
  state
) => {
  return state.form.newComment;
};

export const getNewComment = createSelector(getNewCommentState, (newComment) => newComment);

export const getHasNameError = (state: EventFiltersListPageState): boolean => {
  return state.form.hasNameError;
};

export const getFormHasError = (state: EventFiltersListPageState): boolean => {
  return state.form.hasItemsError || state.form.hasNameError || state.form.hasOSError;
};

export const isCreationInProgress = (state: EventFiltersListPageState): boolean => {
  return isLoadingResourceState(state.form.submissionResourceState);
};

export const isCreationSuccessful = (state: EventFiltersListPageState): boolean => {
  return isLoadedResourceState(state.form.submissionResourceState);
};

export const isUninitialisedForm = (state: EventFiltersListPageState): boolean => {
  return isUninitialisedResourceState(state.form.submissionResourceState);
};

export const getActionError = (state: EventFiltersListPageState): ServerApiError | undefined => {
  const submissionResourceState = state.form.submissionResourceState;

  return isFailedResourceState(submissionResourceState) ? submissionResourceState.error : undefined;
};

export const getSubmissionResourceState: EventFiltersSelector<
  StoreState['form']['submissionResourceState']
> = (state) => {
  return state.form.submissionResourceState;
};

export const getSubmissionResource = createSelector(
  getSubmissionResourceState,
  (submissionResourceState) => submissionResourceState
);

export const getCurrentLocation = (state: EventFiltersListPageState): EventFiltersPageLocation =>
  state.location;

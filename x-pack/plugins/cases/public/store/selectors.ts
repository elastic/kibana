/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '.';

const state = (rootState: RootState) => rootState;

// eslint-disable-next-line @typescript-eslint/no-shadow
const selectedEventIdAddExistingCase = createSelector(state, function (state) {
  return state.addToCase.addToExistingCaseOpenID;
});
// eslint-disable-next-line @typescript-eslint/no-shadow
const selectedEventIdCreateNewCase = createSelector(state, function (state) {
  return state.addToCase.createNewCaseOpenID;
});

export const activeCaseFlowId = createSelector(
  selectedEventIdAddExistingCase,
  selectedEventIdCreateNewCase,
  function (addNewId, createNewId) {
    return addNewId || createNewId;
  }
);

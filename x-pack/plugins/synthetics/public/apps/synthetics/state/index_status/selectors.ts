/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RooState } from '../root_reducer';

const getState = (appState: RooState) => appState.indexStatus;
export const selectIndexState = createSelector(getState, (state) => state);

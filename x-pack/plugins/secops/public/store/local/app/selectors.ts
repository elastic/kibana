/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../../reducer';
import { NotesById, Theme } from './model';

const selectTheme = (state: State): Theme => state.local.app.theme;

export const themeSelector = createSelector(selectTheme, theme => theme);

const selectNotesById = (state: State): NotesById => state.local.app.notesById;

export const notesByIdSelector = createSelector(selectNotesById, notesById => notesById);

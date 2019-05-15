/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { Note } from '../../lib/note';

const actionCreator = actionCreatorFactory('x-pack/siem/local/app');

export const updateNote = actionCreator<{ note: Note }>('UPDATE_NOTE');

export const addError = actionCreator<{ id: string; title: string; message: string }>('ADD_ERRORS');

export const removeError = actionCreator<{ id: string }>('REMOVE_ERRORS');

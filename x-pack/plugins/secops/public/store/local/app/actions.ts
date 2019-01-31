/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { Note } from '../../../lib/note';

const actionCreator = actionCreatorFactory('x-pack/secops/local/app');

export const updateNote = actionCreator<{ note: Note }>('UPDATE_NOTE');

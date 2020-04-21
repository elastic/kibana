/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../../../common/utility_types';
import { SavedNoteRuntimeType } from '../../../../../common/types/timeline/note';

export const eventNotes = runtimeTypes.array(unionWithNullType(SavedNoteRuntimeType));
export const globalNotes = runtimeTypes.array(unionWithNullType(SavedNoteRuntimeType));
export const pinnedEventIds = runtimeTypes.array(unionWithNullType(runtimeTypes.string));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as runtimeTypes from 'io-ts';
import { unionWithNullType } from '../../../../../common/utility_types';
import { SavedNoteRuntimeType } from '../../../../../common/types/timeline/note';

export const eventNotes = unionWithNullType(runtimeTypes.array(SavedNoteRuntimeType));
export const globalNotes = unionWithNullType(runtimeTypes.array(SavedNoteRuntimeType));
export const pinnedEventIds = unionWithNullType(runtimeTypes.array(runtimeTypes.string));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import type { Maybe } from '../../../search_strategy/common';

import { unionWithNullType } from '../../../utility_types';

export const NoteServerRepresentation = runtimeTypes.intersection([
  runtimeTypes.type({
    timelineId: unionWithNullType(runtimeTypes.string),
  }),
  runtimeTypes.partial({
    eventId: unionWithNullType(runtimeTypes.string),
    note: unionWithNullType(runtimeTypes.string),
    created: unionWithNullType(runtimeTypes.number),
    createdBy: unionWithNullType(runtimeTypes.string),
    updated: unionWithNullType(runtimeTypes.number),
    updatedBy: unionWithNullType(runtimeTypes.string),
  }),
]);

export interface NoteResult {
  eventId?: Maybe<string>;

  note?: Maybe<string>;

  timelineId?: Maybe<string>;

  noteId: string;

  created?: Maybe<number>;

  createdBy?: Maybe<string>;

  timelineVersion?: Maybe<string>;

  updated?: Maybe<number>;

  updatedBy?: Maybe<string>;

  version?: Maybe<string>;
}

export interface ResponseNote {
  code?: Maybe<number>;

  message?: Maybe<string>;

  note: NoteResult;
}

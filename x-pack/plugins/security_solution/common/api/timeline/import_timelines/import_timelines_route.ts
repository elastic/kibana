/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { BareNoteSchema, SavedTimelineRuntimeType } from '../model/api';
import { unionWithNullType } from '../../../utility_types';

import { pinnedEventIds } from '../pinned_events/pinned_events_route';

export const eventNotes = unionWithNullType(rt.array(BareNoteSchema));
export const globalNotes = unionWithNullType(rt.array(BareNoteSchema));

export const ImportTimelinesSchemaRt = rt.intersection([
  SavedTimelineRuntimeType,
  rt.type({
    savedObjectId: unionWithNullType(rt.string),
    version: unionWithNullType(rt.string),
  }),
  rt.type({
    globalNotes,
    eventNotes,
    pinnedEventIds,
  }),
]);

export type ImportTimelinesSchema = rt.TypeOf<typeof ImportTimelinesSchemaRt>;

const ReadableRt = rt.partial({
  _maxListeners: rt.unknown,
  _readableState: rt.unknown,
  _read: rt.unknown,
  readable: rt.boolean,
  _events: rt.unknown,
  _eventsCount: rt.number,
  _data: rt.unknown,
  _position: rt.number,
  _encoding: rt.string,
});

const booleanInString = rt.union([rt.literal('true'), rt.literal('false')]);

export const ImportTimelinesPayloadSchemaRt = rt.intersection([
  rt.type({
    file: rt.intersection([
      ReadableRt,
      rt.type({
        hapi: rt.type({
          filename: rt.string,
          headers: rt.unknown,
        }),
      }),
    ]),
  }),
  rt.partial({ isImmutable: booleanInString }),
]);

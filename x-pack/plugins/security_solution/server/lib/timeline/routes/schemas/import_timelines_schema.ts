/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';

import { Readable } from 'stream';
import { either } from 'fp-ts/lib/Either';

import { SavedTimelineRuntimeType } from '../../../../../common/types/timeline';

import { eventNotes, globalNotes, pinnedEventIds } from './schemas';
import { unionWithNullType } from '../../../../../common/utility_types';

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

const ReadableRt = new rt.Type<Readable, Readable, unknown>(
  'ReadableRt',
  (u): u is Readable => u instanceof Readable,
  (u, c) =>
    either.chain(rt.object.validate(u, c), (s) => {
      const d = s as Readable;
      return d.readable ? rt.success(d) : rt.failure(u, c);
    }),
  (a) => a
);

const booleanInString = rt.union([rt.literal('true'), rt.literal('false')]);

export const ImportTimelinesPayloadSchemaRt = rt.intersection([
  rt.type({
    file: rt.intersection([
      ReadableRt,
      rt.type({
        hapi: rt.type({ filename: rt.string }),
      }),
    ]),
  }),
  rt.partial({ isImmutable: booleanInString }),
]);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as rt from 'io-ts';
import type { Transform } from 'stream';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { createConcatStream, createSplitStream, createMapStream } from '@kbn/utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  parseNdjsonStrings,
  filterExportedCounts,
  createLimitStream,
} from '../../../../../utils/read_stream/create_stream_from_ndjson';

import type { ImportTimelineResponse } from './types';
import { ImportTimelinesSchemaRt } from '../../../schemas/timelines/import_timelines_schema';
import { throwErrors } from '../../../utils/common';

type ErrorFactory = (message: string) => Error;

export const createPlainError = (message: string) => new Error(message);

export const decodeOrThrow =
  <A, O, I>(runtimeType: rt.Type<A, O, I>, createError: ErrorFactory = createPlainError) =>
  (inputValue: I) =>
    pipe(runtimeType.decode(inputValue), fold(throwErrors(createError), identity));

export const validateTimelines = (): Transform =>
  createMapStream((obj: ImportTimelineResponse) =>
    obj instanceof Error
      ? new BadRequestError(obj.message)
      : decodeOrThrow(ImportTimelinesSchemaRt)(obj)
  );
export const createTimelinesStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    validateTimelines(),
    createLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};

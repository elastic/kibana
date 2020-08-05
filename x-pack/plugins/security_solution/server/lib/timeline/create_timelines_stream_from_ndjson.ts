/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';
import { Transform } from 'stream';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { failure } from 'io-ts/lib/PathReporter';
import { identity } from 'fp-ts/lib/function';
import {
  createConcatStream,
  createSplitStream,
  createMapStream,
} from '../../../../../../src/legacy/utils';
import {
  parseNdjsonStrings,
  filterExportedCounts,
  createLimitStream,
} from '../../utils/read_stream/create_stream_from_ndjson';

import { ImportTimelineResponse } from './routes/utils/import_timelines';
import { ImportTimelinesSchemaRt } from './routes/schemas/import_timelines_schema';
import { BadRequestError } from '../detection_engine/errors/bad_request_error';

type ErrorFactory = (message: string) => Error;

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) => {
  throw createError(failure(errors).join('\n'));
};

export const decodeOrThrow = <A, O, I>(
  runtimeType: rt.Type<A, O, I>,
  createError: ErrorFactory = createPlainError
) => (inputValue: I) =>
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

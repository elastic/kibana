/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodError, ZodType } from '@kbn/zod';
import type { Transform } from 'stream';
import { pipe } from 'fp-ts/lib/pipeable';
import { type Either, fold, left, right } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { createConcatStream, createSplitStream, createMapStream } from '@kbn/utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  parseNdjsonStrings,
  filterExportedCounts,
  createLimitStream,
} from '../../../../../utils/read_stream/create_stream_from_ndjson';

import type { ImportTimelineResponse } from './types';
import { ImportTimelines } from '../../../../../../common/api/timeline';
import { throwErrors } from '../../../utils/common';

type ErrorFactory = (message: string) => Error;

const createPlainError = (message: string) => new Error(message);

const parseRuntimeType =
  <T>(zodType: ZodType<T>) =>
  (v: unknown): Either<ZodError<T>, T> => {
    const result = zodType.safeParse(v);
    return result.success ? right(result.data) : left(result.error);
  };

const decodeOrThrow =
  (runtimeType: ZodType, createError: ErrorFactory = createPlainError) =>
  (inputValue: unknown) =>
    pipe(parseRuntimeType(runtimeType)(inputValue), fold(throwErrors(createError), identity));

const validateTimelines = (): Transform =>
  createMapStream((obj: ImportTimelineResponse) =>
    obj instanceof Error ? new BadRequestError(obj.message) : decodeOrThrow(ImportTimelines)(obj)
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';

import { has } from 'lodash/fp';
import {
  ExportExceptionDetails,
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  createConcatStream,
  createFilterStream,
  createMapStream,
  createSplitStream,
} from '@kbn/utils';

import { validateExceptionsStream } from './validate_incoming_exceptions';
import { sortExceptionsStream } from './sort_incoming_exceptions';

/**
 * Filters out empty strings from ndjson stream
 */
export const filterEmptyStrings = (): Transform => {
  return createFilterStream<string>((ndJsonStr) => ndJsonStr.trim() !== '');
};

/**
 * Parses strings from ndjson stream
 */
export const parseNdjsonStrings = (): Transform => {
  return createMapStream((ndJsonStr: string): Transform => {
    try {
      return JSON.parse(ndJsonStr);
    } catch (err) {
      return err;
    }
  });
};

/**
 * Filters out the counts metadata added on export
 */
export const filterExportedCounts = (): Transform => {
  return createFilterStream<
    ImportExceptionListSchemaDecoded | ImportExceptionListItemSchemaDecoded | ExportExceptionDetails
  >((obj) => obj != null && !has('exported_exception_list_count', obj));
};

// Adaptation from: saved_objects/import/create_limit_stream.ts
export const createLimitStream = (limit: number): Transform => {
  return new Transform({
    objectMode: true,
    async transform(obj, _, done): Promise<void> {
      if (obj.lists.length + obj.items.length >= limit) {
        done(new Error(`Can't import more than ${limit} exceptions`));
      } else {
        done(undefined, obj);
      }
    },
  });
};

/**
 * Inspiration and the pattern of code followed is from:
 * saved_objects/lib/create_saved_objects_stream_from_ndjson.ts
 */
export const createExceptionsStreamFromNdjson = (exceptionsLimit: number): Transform[] => {
  return [
    createSplitStream('\n'),
    filterEmptyStrings(),
    parseNdjsonStrings(),
    filterExportedCounts(),
    sortExceptionsStream(),
    validateExceptionsStream(),
    createLimitStream(exceptionsLimit),
    createConcatStream([]),
  ];
};

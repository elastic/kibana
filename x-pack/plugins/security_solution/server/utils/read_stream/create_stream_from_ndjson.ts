/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import { has, isString } from 'lodash/fp';
import { createMapStream, createFilterStream } from '@kbn/utils';

import { ImportRulesSchemaDecoded } from '../../../common/detection_engine/schemas/request/import_rules_schema';

export interface RulesObjectsExportResultDetails {
  /** number of successfully exported objects */
  exportedCount: number;
}

export const parseNdjsonStrings = (): Transform => {
  return createMapStream((ndJsonStr: string) => {
    if (isString(ndJsonStr) && ndJsonStr.trim() !== '') {
      try {
        return JSON.parse(ndJsonStr);
      } catch (err) {
        return err;
      }
    }
  });
};

export const filterExportedCounts = (): Transform => {
  return createFilterStream<ImportRulesSchemaDecoded | RulesObjectsExportResultDetails>(
    (obj) => obj != null && !has('exported_count', obj)
  );
};

export const filterExceptions = (): Transform => {
  return createFilterStream<ImportRulesSchemaDecoded | RulesObjectsExportResultDetails>(
    (obj) => obj != null && !has('list_id', obj)
  );
};

// Adaptation from: saved_objects/import/create_limit_stream.ts
export const createLimitStream = (limit: number): Transform => {
  let counter = 0;
  return new Transform({
    objectMode: true,
    async transform(obj, _, done) {
      if (counter >= limit) {
        return done(new Error(`Can't import more than ${limit} rules`));
      }
      counter++;
      done(undefined, obj);
    },
  });
};

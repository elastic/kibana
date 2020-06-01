/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Transform } from 'stream';
import { has, isString } from 'lodash/fp';
import { ImportRuleAlertRest } from '../../lib/detection_engine/types';
import { createMapStream, createFilterStream } from '../../../../../../src/legacy/utils/streams';
import { importRulesSchema } from '../../lib/detection_engine/routes/schemas/import_rules_schema';
import { BadRequestError } from '../../lib/detection_engine/errors/bad_request_error';

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
  return createFilterStream<ImportRuleAlertRest | RulesObjectsExportResultDetails>(
    (obj) => obj != null && !has('exported_count', obj)
  );
};

export const validateRules = (): Transform => {
  return createMapStream((obj: ImportRuleAlertRest) => {
    if (!(obj instanceof Error)) {
      const validated = importRulesSchema.validate(obj);
      if (validated.error != null) {
        return new BadRequestError(validated.error.message);
      } else {
        return validated.value;
      }
    } else {
      return obj;
    }
  });
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

export const transformDataToNdjson = (data: unknown[]): string => {
  if (data.length !== 0) {
    const dataString = data.map((rule) => JSON.stringify(rule)).join('\n');
    return `${dataString}\n`;
  } else {
    return '';
  }
};

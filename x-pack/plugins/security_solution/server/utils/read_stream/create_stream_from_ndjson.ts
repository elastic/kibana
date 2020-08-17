/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Transform } from 'stream';
import { has, isString } from 'lodash/fp';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { formatErrors } from '../../../common/format_errors';
import { importRuleValidateTypeDependents } from '../../../common/detection_engine/schemas/request/import_rules_type_dependents';
import {
  ImportRulesSchemaDecoded,
  importRulesSchema,
  ImportRulesSchema,
} from '../../../common/detection_engine/schemas/request/import_rules_schema';
import { exactCheck } from '../../../common/exact_check';
import { createMapStream, createFilterStream } from '../../../../../../src/legacy/utils/streams';
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
  return createFilterStream<ImportRulesSchemaDecoded | RulesObjectsExportResultDetails>(
    (obj) => obj != null && !has('exported_count', obj)
  );
};

export const validateRules = (): Transform => {
  return createMapStream((obj: ImportRulesSchema) => {
    if (!(obj instanceof Error)) {
      const decoded = importRulesSchema.decode(obj);
      const checked = exactCheck(obj, decoded);
      const onLeft = (errors: t.Errors): BadRequestError | ImportRulesSchemaDecoded => {
        return new BadRequestError(formatErrors(errors).join());
      };
      const onRight = (schema: ImportRulesSchema): BadRequestError | ImportRulesSchemaDecoded => {
        const validationErrors = importRuleValidateTypeDependents(schema);
        if (validationErrors.length) {
          return new BadRequestError(validationErrors.join());
        } else {
          return schema as ImportRulesSchemaDecoded;
        }
      };
      return pipe(checked, fold(onLeft, onRight));
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

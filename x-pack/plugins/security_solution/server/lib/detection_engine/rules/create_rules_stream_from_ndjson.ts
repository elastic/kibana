/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Transform } from 'stream';
import { ImportRuleAlertRest } from '../types';
import {
  createSplitStream,
  createMapStream,
  createConcatStream,
} from '../../../../../../../src/legacy/utils/streams';
import { importRulesSchema } from '../routes/schemas/import_rules_schema';
import { BadRequestError } from '../errors/bad_request_error';
import {
  parseNdjsonStrings,
  filterExportedCounts,
  createLimitStream,
} from '../../../utils/read_stream/create_stream_from_ndjson';

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

// TODO: Capture both the line number and the rule_id if you have that information for the error message
// eventually and then pass it down so we can give error messages on the line number

/**
 * Inspiration and the pattern of code followed is from:
 * saved_objects/lib/create_saved_objects_stream_from_ndjson.ts
 */
export const createRulesStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    validateRules(),
    createLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};

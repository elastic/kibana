/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Transform } from 'stream';
import type * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import {
  createSplitStream,
  createMapStream,
  createConcatStream,
  createReduceStream,
} from '@kbn/utils';

import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type {
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { has } from 'lodash/fp';
import { importRuleValidateTypeDependents } from '../../../../../../common/detection_engine/rule_management/api/rules/import_rules/import_rules_type_dependents';
import type { ImportRulesSchema } from '../../../../../../common/detection_engine/rule_management/api/rules/import_rules/import_rules_schema';
import { importRulesSchema } from '../../../../../../common/detection_engine/rule_management/api/rules/import_rules/import_rules_schema';
import {
  parseNdjsonStrings,
  createRulesLimitStream,
  filterExportedCounts,
} from '../../../../../utils/read_stream/create_stream_from_ndjson';

/**
 * Validates exception lists and items schemas
 */
export const validateRulesStream = (): Transform => {
  return createMapStream<{
    exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema | Error>;
    rules: Array<ImportRulesSchema | Error>;
  }>((items) => ({
    exceptions: items.exceptions,
    rules: validateRules(items.rules),
  }));
};

export const validateRules = (
  rules: Array<ImportRulesSchema | Error>
): Array<ImportRulesSchema | Error> => {
  return rules.map((obj: ImportRulesSchema | Error) => {
    if (!(obj instanceof Error)) {
      const decoded = importRulesSchema.decode(obj);
      const checked = exactCheck(obj, decoded);
      const onLeft = (errors: t.Errors): BadRequestError | ImportRulesSchema => {
        return new BadRequestError(formatErrors(errors).join());
      };
      const onRight = (schema: ImportRulesSchema): BadRequestError | ImportRulesSchema => {
        const validationErrors = importRuleValidateTypeDependents(schema);
        if (validationErrors.length) {
          return new BadRequestError(validationErrors.join());
        } else {
          return schema;
        }
      };
      return pipe(checked, fold(onLeft, onRight));
    } else {
      return obj;
    }
  });
};

/**
 * Sorts the exceptions into the lists and items.
 * We do this because we don't want the order of the exceptions
 * in the import to matter. If we didn't sort, then some items
 * might error if the list has not yet been created
 */
export const sortImports = (): Transform => {
  return createReduceStream<{
    exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema | Error>;
    rules: Array<ImportRulesSchema | Error>;
  }>(
    (acc, importItem) => {
      if (has('list_id', importItem) || has('item_id', importItem) || has('entries', importItem)) {
        return { ...acc, exceptions: [...acc.exceptions, importItem] };
      } else {
        return { ...acc, rules: [...acc.rules, importItem] };
      }
    },
    {
      exceptions: [],
      rules: [],
    }
  );
};

// TODO: Capture both the line number and the rule_id if you have that information for the error message
// eventually and then pass it down so we can give error messages on the line number

export const createRulesAndExceptionsStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    sortImports(),
    validateRulesStream(),
    createRulesLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};

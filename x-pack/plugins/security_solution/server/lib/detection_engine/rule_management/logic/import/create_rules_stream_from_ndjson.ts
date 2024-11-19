/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import type { Transform } from 'stream';
import {
  createSplitStream,
  createMapStream,
  createConcatStream,
  createReduceStream,
} from '@kbn/utils';

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type {
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { stringifyZodError } from '@kbn/zod-helpers';
import type { RuleToImportInput } from '../../../../../../common/api/detection_engine/rule_management';
import {
  RuleToImport,
  validateRuleToImport,
} from '../../../../../../common/api/detection_engine/rule_management';
import type { RulesObjectsExportResultDetails } from '../../../../../utils/read_stream/create_stream_from_ndjson';
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
    rules: Array<RuleToImportInput | Error>;
    actionConnectors: SavedObject[];
  }>((items) => ({
    actionConnectors: items.actionConnectors,
    exceptions: items.exceptions,
    rules: validateRules(items.rules),
  }));
};

export const validateRules = (
  rules: Array<RuleToImportInput | Error>
): Array<RuleToImport | Error> => {
  return rules.map((obj: RuleToImportInput | Error) => {
    if (obj instanceof Error) {
      return obj;
    }

    const result = RuleToImport.safeParse({
      ...obj,
      // Ignore the rule source field for now. A proper handling of this field
      // will be added as part of https://github.com/elastic/kibana/issues/180168
      rule_source: undefined,
    });
    if (!result.success) {
      return new BadRequestError(stringifyZodError(result.error));
    }

    const validationErrors = validateRuleToImport(result.data);
    if (validationErrors.length) {
      return new BadRequestError(validationErrors.join());
    }

    return result.data;
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
    rules: Array<RuleToImportInput | Error>;
    actionConnectors: SavedObject[];
  }>(
    (acc, importItem) => {
      if (has('list_id', importItem) || has('item_id', importItem) || has('entries', importItem)) {
        return { ...acc, exceptions: [...acc.exceptions, importItem] };
      }
      if (has('attributes', importItem)) {
        return { ...acc, actionConnectors: [...acc.actionConnectors, importItem] };
      } else {
        return { ...acc, rules: [...acc.rules, importItem] };
      }
    },
    {
      exceptions: [],
      rules: [],
      actionConnectors: [],
    }
  );
};

export const migrateLegacyInvestigationFields = (): Transform => {
  return createMapStream<RuleToImportInput | RulesObjectsExportResultDetails>((obj) => {
    if (obj != null && 'investigation_fields' in obj && Array.isArray(obj.investigation_fields)) {
      if (obj.investigation_fields.length) {
        return {
          ...obj,
          investigation_fields: {
            field_names: obj.investigation_fields,
          },
        };
      } else {
        const { investigation_fields: _, ...rest } = obj;
        return rest;
      }
    }
    return obj;
  });
};

// TODO: Capture both the line number and the rule_id if you have that information for the error message
// eventually and then pass it down so we can give error messages on the line number

export const createRulesAndExceptionsStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    migrateLegacyInvestigationFields(),
    sortImports(),
    validateRulesStream(),
    createRulesLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};

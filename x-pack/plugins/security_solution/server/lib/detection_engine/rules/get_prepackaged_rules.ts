/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { formatErrors } from '../../../../common/format_errors';
import { exactCheck } from '../../../../common/exact_check';
import {
  addPrepackagedRulesSchema,
  AddPrepackagedRulesSchema,
  AddPrepackagedRulesSchemaDecoded,
} from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { BadRequestError } from '../errors/bad_request_error';
import { rawRules } from './prepackaged_rules';

/**
 * Validate the rules from the file system and throw any errors indicating to the developer
 * that they are adding incorrect schema rules. Also this will auto-flush in all the default
 * aspects such as default interval of 5 minutes, default arrays, etc...
 */
export const validateAllPrepackagedRules = (
  rules: AddPrepackagedRulesSchema[]
): AddPrepackagedRulesSchemaDecoded[] => {
  return rules.map((rule) => {
    const decoded = addPrepackagedRulesSchema.decode(rule);
    const checked = exactCheck(rule, decoded);

    const onLeft = (errors: t.Errors): AddPrepackagedRulesSchemaDecoded => {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new BadRequestError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the folder rules/prepackaged_rules ` +
          `is not a valid detection engine rule. Expect the system ` +
          `to not work with pre-packaged rules until this rule is fixed ` +
          `or the file is removed. Error is: ${formatErrors(
            errors
          ).join()}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    };

    const onRight = (schema: AddPrepackagedRulesSchema): AddPrepackagedRulesSchemaDecoded => {
      return schema as AddPrepackagedRulesSchemaDecoded;
    };
    return pipe(checked, fold(onLeft, onRight));
  });
};

export const getPrepackagedRules = (rules = rawRules): AddPrepackagedRulesSchemaDecoded[] =>
  validateAllPrepackagedRules(rules);

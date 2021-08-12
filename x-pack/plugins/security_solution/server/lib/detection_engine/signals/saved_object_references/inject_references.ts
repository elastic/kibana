/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from 'src/core/server';
import { RuleParams } from '../../schemas/rule_schemas';
import { injectExceptionsReferences } from './inject_exceptions_list';

/**
 * Injects references and returns the saved object references.
 * How to add a new injected references here:
 * ---
 * Add a new file for injection named: inject_<paramName>.ts, example: inject_foo.ts
 * Add a new function into that file named: inject<ParamName>, example: injectFooReferences(logger, params.foo)
 * Add a new line below and spread the new parameter together like so:
 *
 * const foo = injectFooReferences(logger, params.foo, savedObjectReferences);
 * const ruleParamsWithSavedObjectReferences: RuleParams = {
 *   ...params,
 *   foo,
 *   exceptionsList,
 * };
 * @param logger Kibana injected logger
 * @param params The params of the base rule(s).
 * @param savedObjectReferences The saved object references to merge with the rule params
 * @returns The rule parameters with the saved object references.
 */
export const injectReferences = ({
  logger,
  params,
  savedObjectReferences,
}: {
  logger: Logger;
  params: RuleParams;
  savedObjectReferences: SavedObjectReference[];
}): RuleParams => {
  const exceptionsList = injectExceptionsReferences({
    logger,
    exceptionsList: params.exceptionsList,
    savedObjectReferences,
  });
  const ruleParamsWithSavedObjectReferences: RuleParams = {
    ...params,
    exceptionsList,
  };
  return ruleParamsWithSavedObjectReferences;
};

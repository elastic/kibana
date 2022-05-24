/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, isEqual, pick } from 'lodash';
import { validate } from '@kbn/securitysolution-io-ts-utils';

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { RuleAlertType } from './types';
import { InternalRuleUpdate, internalRuleUpdate } from '../schemas/rule_schemas';

class EditRuleError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface EditRuleParams {
  /** An instance of RulesClient from the Alerting Framework. */
  rulesClient: RulesClient;

  /** Original, existing rule to be edited. Needs to be fetched from Elasticsearch via RulesClient. */
  rule: RuleAlertType;

  /** A function that implements in-memory modifications: returns a new rule object with the changes. */
  edit: (rule: RuleAlertType) => RuleAlertType;
}

/** At this point we support editing of only these fields. */
const FIELDS_THAT_CAN_BE_EDITED = ['params', 'tags'] as const;

/**
 * Applies in-memory modifications to a given rule and updates it in Elasticsearch via RulesClient.
 *
 * NOTE: At this point we only support editing of the following fields:
 *   - rule.params
 *   - rule.tags
 * All other changes made by the `edit` function will be ignored.
 *
 * @returns The edited rule.
 */
export const editRule = async (params: EditRuleParams): Promise<RuleAlertType> => {
  const { rulesClient, rule, edit } = params;
  const isPrebuiltRule = rule.params.immutable;
  const isCustomRule = !rule.params.immutable;

  if (isPrebuiltRule) {
    throw new EditRuleError('Elastic rule can`t be edited', 400);
  }

  const editedRule = applyChanges(rule, edit);

  // If the rule wasn't changed by the `edit` function, we don't need to proceed with the update.
  if (!isRuleChanged(rule, editedRule)) {
    return rule;
  }

  // We need to increment the rule's version if it is a custom rule. If the rule is an Elastic
  // prebuilt rule, we don't want to touch its version - it's managed by the rule authors.
  // This check is left here explicitly because we're planning to allow editing for prebuilt rules,
  // and the check for isPrebuiltRule above might be removed.
  if (isCustomRule) {
    editedRule.params.version = editedRule.params.version + 1;
  }

  const updateData = createUpdateData(rule, editedRule);
  await rulesClient.update({
    id: rule.id,
    data: updateData,
  });

  // It would be great to return the updated rule returned from the RulesClient.update() call.
  // Note that there's a type mismatch between RuleAlertType and the update method result.
  return editedRule;
};

const applyChanges = (
  originalRule: RuleAlertType,
  edit: (rule: RuleAlertType) => RuleAlertType
): RuleAlertType => {
  // For safety, deeply clone the rule object before applying edits to it.
  const clonedRule = cloneDeep(originalRule);
  const editedRule = edit(clonedRule);
  const sanitizedRule = validateAndSanitizeChanges(originalRule, editedRule);
  return sanitizedRule;
};

const validateAndSanitizeChanges = (
  original: RuleAlertType,
  changed: RuleAlertType
): RuleAlertType => {
  // These checks should never throw unless there's a bug in the passed `edit` function.
  if (changed.params.immutable !== original.params.immutable) {
    throw new EditRuleError(`Internal rule editing error: can't change "params.immutable"`, 500);
  }
  if (changed.params.version !== original.params.version) {
    throw new EditRuleError(`Internal rule editing error: can't change "params.version"`, 500);
  }

  return changed;
};

const isRuleChanged = (originalRule: RuleAlertType, editedRule: RuleAlertType): boolean => {
  const originalData = pick(originalRule, FIELDS_THAT_CAN_BE_EDITED);
  const editedData = pick(editedRule, FIELDS_THAT_CAN_BE_EDITED);
  return !isEqual(originalData, editedData);
};

const createUpdateData = (
  originalRule: RuleAlertType,
  editedRule: RuleAlertType
): InternalRuleUpdate => {
  const data: InternalRuleUpdate = {
    // At this point we intentionally support updating of only these fields:
    ...pick(editedRule, FIELDS_THAT_CAN_BE_EDITED),
    // We omit other fields and get them from the original (unedited) rule:
    name: originalRule.name,
    schedule: originalRule.schedule,
    actions: originalRule.actions,
    throttle: originalRule.throttle,
    notifyWhen: originalRule.notifyWhen,
  };

  const [validatedData, validationError] = validate(data, internalRuleUpdate);
  if (validationError != null || validatedData === null) {
    throw new EditRuleError(`Editing rule would create invalid rule: ${validationError}`, 500);
  }

  return validatedData;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { RuleAlertType } from './types';

/**
 * Returns the rules to update by doing a compare to the rules from the file system against
 * the installed rules already. This also merges exception list items between the two since
 * exception list items can exist on both rules to update and already installed rules.
 * @param rulesFromFileSystem The rules on the file system to check against installed
 * @param installedRules The installed rules
 */
export const getRulesToUpdate = (
  rulesFromFileSystem: AddPrepackagedRulesSchemaDecoded[],
  installedRules: RuleAlertType[]
) => {
  return rulesFromFileSystem
    .filter((ruleFromFileSystem) => filterInstalledRules(ruleFromFileSystem, installedRules))
    .map((ruleFromFileSystem) => mergeExceptionLists(ruleFromFileSystem, installedRules));
};

/**
 * Filters rules from the file system that do not match the installed rules so you only
 * get back rules that are going to be updated
 * @param ruleFromFileSystem The rules from the file system to check if any are updates
 * @param installedRules The installed rules to compare against for updates
 */
export const filterInstalledRules = (
  ruleFromFileSystem: AddPrepackagedRulesSchemaDecoded,
  installedRules: RuleAlertType[]
): boolean => {
  return installedRules.some((installedRule) => {
    return (
      ruleFromFileSystem.rule_id === installedRule.params.ruleId &&
      ruleFromFileSystem.version > installedRule.params.version
    );
  });
};

/**
 * Given a rule from the file system and the set of installed rules this will merge the exception lists
 * from the installed rules onto the rules from the file system.
 * @param ruleFromFileSystem The rules from the file system that might have exceptions_lists
 * @param installedRules The installed rules which might have user driven exceptions_lists
 */
export const mergeExceptionLists = (
  ruleFromFileSystem: AddPrepackagedRulesSchemaDecoded,
  installedRules: RuleAlertType[]
): AddPrepackagedRulesSchemaDecoded => {
  if (ruleFromFileSystem.exceptions_list != null) {
    const installedRule = installedRules.find(
      (ruleToFind) => ruleToFind.params.ruleId === ruleFromFileSystem.rule_id
    );
    if (installedRule != null && installedRule.params.exceptionsList != null) {
      const installedExceptionList = installedRule.params.exceptionsList;
      const fileSystemExceptions = ruleFromFileSystem.exceptions_list.filter((potentialDuplicate) =>
        installedExceptionList.every((item) => item.list_id !== potentialDuplicate.list_id)
      );
      return {
        ...ruleFromFileSystem,
        exceptions_list: [...fileSystemExceptions, ...installedRule.params.exceptionsList],
      };
    } else {
      return ruleFromFileSystem;
    }
  } else {
    return ruleFromFileSystem;
  }
};

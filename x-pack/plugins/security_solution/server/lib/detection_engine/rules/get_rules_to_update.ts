/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { RuleAlertType } from './types';

export const getRulesToUpdate = (
  rulesFromFileSystem: AddPrepackagedRulesSchemaDecoded[],
  installedRules: RuleAlertType[]
): AddPrepackagedRulesSchemaDecoded[] => {
  return rulesFromFileSystem
    .filter((ruleFromFileSystem) =>
      installedRules.some((installedRule) => {
        return (
          ruleFromFileSystem.rule_id === installedRule.params.ruleId &&
          ruleFromFileSystem.version > installedRule.params.version
        );
      })
    )
    .map((ruleFromFileSystem) => {
      if (ruleFromFileSystem.exceptions_list != null) {
        const installedRule = installedRules.find(
          (ruleToFind) => ruleToFind.params.ruleId === ruleFromFileSystem.rule_id
        );
        if (installedRule != null && installedRule.params.exceptionsList != null) {
          const installedExceptionList = installedRule.params.exceptionsList;
          const fileSystemExceptions = ruleFromFileSystem.exceptions_list.filter(
            (potentialDuplicate) =>
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
      const installedExceptions = installedRule.params.exceptionsList.filter(
        (installedExceptionList) =>
          ruleFromFileSystem.exceptions_list.some(
            (exceptionList) => installedExceptionList.list_id !== exceptionList.list_id
          )
      );
      return {
        ...ruleFromFileSystem,
        exceptions_list: [...ruleFromFileSystem.exceptions_list, ...installedExceptions],
      };
    } else {
      return ruleFromFileSystem;
    }
  } else {
    return ruleFromFileSystem;
  }
};

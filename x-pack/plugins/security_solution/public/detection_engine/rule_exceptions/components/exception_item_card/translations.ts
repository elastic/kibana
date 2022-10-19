/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_ITEM_EDIT_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.editItemButton',
  {
    defaultMessage: 'Edit rule exception',
  }
);

export const EXCEPTION_ITEM_DELETE_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.deleteItemButton',
  {
    defaultMessage: 'Delete rule exception',
  }
);

export const ENDPOINT_EXCEPTION_ITEM_EDIT_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.endpoint.editItemButton',
  {
    defaultMessage: 'Edit endpoint exception',
  }
);

export const ENDPOINT_EXCEPTION_ITEM_DELETE_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.endpoint.deleteItemButton',
  {
    defaultMessage: 'Delete endpoint exception',
  }
);

export const EXCEPTION_ITEM_CREATED_LABEL = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.createdLabel',
  {
    defaultMessage: 'Created',
  }
);

export const EXCEPTION_ITEM_UPDATED_LABEL = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.updatedLabel',
  {
    defaultMessage: 'Updated',
  }
);

export const EXCEPTION_ITEM_META_BY = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.metaDetailsBy',
  {
    defaultMessage: 'by',
  }
);

export const exceptionItemCommentsAccordion = (comments: number) =>
  i18n.translate('xpack.securitySolution.ruleExceptions.exceptionItem.showCommentsLabel', {
    values: { comments },
    defaultMessage: 'Show {comments, plural, =1 {comment} other {comments}} ({comments})',
  });

export const CONDITION_OPERATOR_TYPE_MATCH = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.matchOperator',
  {
    defaultMessage: 'IS',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.matchOperator.not',
  {
    defaultMessage: 'IS NOT',
  }
);

export const CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.wildcardMatchesOperator',
  {
    defaultMessage: 'MATCHES',
  }
);

export const CONDITION_OPERATOR_TYPE_WILDCARD_DOES_NOT_MATCH = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.wildcardDoesNotMatchOperator',
  {
    defaultMessage: 'DOES NOT MATCH',
  }
);

export const CONDITION_OPERATOR_TYPE_NESTED = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.nestedOperator',
  {
    defaultMessage: 'has',
  }
);

export const CONDITION_OPERATOR_TYPE_MATCH_ANY = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.matchAnyOperator',
  {
    defaultMessage: 'is one of',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.matchAnyOperator.not',
  {
    defaultMessage: 'is not one of',
  }
);

export const CONDITION_OPERATOR_TYPE_EXISTS = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.existsOperator',
  {
    defaultMessage: 'exists',
  }
);

export const CONDITION_OPERATOR_TYPE_DOES_NOT_EXIST = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.existsOperator.not',
  {
    defaultMessage: 'does not exist',
  }
);

export const CONDITION_OPERATOR_TYPE_LIST = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.listOperator',
  {
    defaultMessage: 'included in',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_IN_LIST = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.listOperator.not',
  {
    defaultMessage: 'is not included in',
  }
);

export const CONDITION_AND = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.and',
  {
    defaultMessage: 'AND',
  }
);

export const CONDITION_OS = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.os',
  {
    defaultMessage: 'OS',
  }
);

export const OS_WINDOWS = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.windows',
  {
    defaultMessage: 'Windows',
  }
);

export const OS_LINUX = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.linux',
  {
    defaultMessage: 'Linux',
  }
);

export const OS_MAC = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.conditions.macos',
  {
    defaultMessage: 'Mac',
  }
);

export const AFFECTED_RULES = (numRules: number) =>
  i18n.translate('xpack.securitySolution.ruleExceptions.exceptionItem.affectedRules', {
    values: { numRules },
    defaultMessage: 'Affects {numRules} {numRules, plural, =1 {rule} other {rules}}',
  });

export const AFFECTED_LIST = i18n.translate(
  'xpack.securitySolution.ruleExceptions.exceptionItem.affectedList',
  {
    defaultMessage: 'Affects shared list',
  }
);

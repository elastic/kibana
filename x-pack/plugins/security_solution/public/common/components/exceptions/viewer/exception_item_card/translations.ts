/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_ITEM_EDIT_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.editItemButton',
  {
    defaultMessage: 'Edit item',
  }
);

export const EXCEPTION_ITEM_DELETE_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.deleteItemButton',
  {
    defaultMessage: 'Delete item',
  }
);

export const EXCEPTION_ITEM_CREATED_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.createdLabel',
  {
    defaultMessage: 'Created',
  }
);

export const EXCEPTION_ITEM_UPDATED_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.updatedLabel',
  {
    defaultMessage: 'Updated',
  }
);

export const EXCEPTION_ITEM_META_BY = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.metaDetailsBy',
  {
    defaultMessage: 'by',
  }
);

export const exceptionItemCommentsAccordion = (comments: number) =>
  i18n.translate('xpack.securitySolution.exceptions.exceptionItem.showCommentsLabel', {
    values: { comments },
    defaultMessage: 'Show {comments, plural, =1 {comment} other {comments}} ({comments})',
  });

export const DESCRIPTOR_WHEN = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.whenDescriptor',
  {
    defaultMessage: 'WHEN',
  }
);

export const CONDITION_OPERATOR_TYPE_MATCH = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.matchOperator',
  {
    defaultMessage: 'IS',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.matchOperator.not',
  {
    defaultMessage: 'IS NOT',
  }
);

export const CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.wildcardMatchesOperator',
  {
    defaultMessage: 'MATCHES',
  }
);

export const CONDITION_OPERATOR_TYPE_NESTED = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.nestedOperator',
  {
    defaultMessage: 'has',
  }
);

export const CONDITION_OPERATOR_TYPE_MATCH_ANY = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.matchAnyOperator',
  {
    defaultMessage: 'is one of',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.matchAnyOperator.not',
  {
    defaultMessage: 'is not one of',
  }
);

export const CONDITION_OPERATOR_TYPE_EXISTS = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.existsOperator',
  {
    defaultMessage: 'exists',
  }
);

export const CONDITION_OPERATOR_TYPE_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.listOperator',
  {
    defaultMessage: 'included in',
  }
);

export const CONDITION_AND = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionItem.conditions.and',
  {
    defaultMessage: 'AND',
  }
);

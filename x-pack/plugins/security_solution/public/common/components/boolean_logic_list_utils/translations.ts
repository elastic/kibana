/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const ADD_NESTED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.booleanLogicUtils.addNestedDescription',
  {
    defaultMessage: 'Add nested condition',
  }
);

export const ADD_NON_NESTED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.booleanLogicUtils.addNonNestedDescription',
  {
    defaultMessage: 'Add non-nested condition',
  }
);

export const AND = i18n.translate('xpack.securitySolution.booleanLogicUtils..and', {
  defaultMessage: 'AND',
});

export const OR = i18n.translate('xpack.securitySolution.booleanLogicUtils..or', {
  defaultMessage: 'OR',
});

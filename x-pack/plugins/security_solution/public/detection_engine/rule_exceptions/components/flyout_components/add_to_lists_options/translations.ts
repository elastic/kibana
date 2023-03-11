/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_LISTS_OPTION = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.addToListsOptions.addToListsOptionLabel',
  {
    defaultMessage: 'Add to shared exception lists',
  }
);

export const GO_TO_EXCEPTIONS = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.addToListsOptions.gotToSharedExceptions',
  {
    defaultMessage: 'Manage shared exception lists',
  }
);

export const ADD_TO_LISTS_OPTION_TOOLTIP = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.addToListsOptions.addToListsTooltip',
  {
    defaultMessage:
      'Shared exception list is a group of exceptions. Select this option if you’d like to add this exception to shared exception lists.',
  }
);

export const ADD_TO_LISTS_OPTION_DISABLED_TOOLTIP = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.rule_exceptions.flyoutComponents.addToListsOptions.addToListsTooltipTitle',
    {
      values: { rulesCount },
      defaultMessage:
        'Shared exception list is a group of exceptions shared across rules. {rulesCount, plural, =1 {This rule currently has no shared} other {These rules currently have no commonly shared}} exception lists attached. To create one, visit the Shared Exception Lists page.',
    }
  );

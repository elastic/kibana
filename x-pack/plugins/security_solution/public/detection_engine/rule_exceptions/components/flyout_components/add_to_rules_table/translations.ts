/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_SELECTED_RULES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.addToRulesTableSelection.addToSelectedRulesDescription',
  {
    defaultMessage:
      'Select rules add to. We will make a copy of this exception if it links to multiple rules. ',
  }
);

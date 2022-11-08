/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_LISTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.addToListsTableSelection.addToListsDescription',
  {
    defaultMessage:
      'Select shared exception list to add to. We will make a copy of this exception if multiple lists are selected.',
  }
);

export const VIEW_LIST_DETAIL_ACTION = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.addToListsTableSelection.viewListDetailActionLabel',
  {
    defaultMessage: 'View list detail',
  }
);

export const REFERENCES_FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.addToListsTableSelection.referencesFetchError',
  {
    defaultMessage: 'Unable to load shared exception lists',
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_LISTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.common.addToListsDescription',
  {
    defaultMessage:
      'Select shared exception list to add to. We will make a copy of this exception if multiple lists are selected.',
  }
);

export const ADD_TO_LIST_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.common.addToListEmptyValue',
  {
    defaultMessage: 'No exception lists',
  }
);

export const ADD_TO_LIST_EMPTY_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.common.addToListEmptyValue',
  {
    defaultMessage: "Looks like you don't have any lists. Create a list first to add items to.",
  }
);

export const VIEW_LIST_DETAIL_ACTION = i18n.translate(
  'xpack.securitySolution.exceptions.common.viewListDetailActionLabel',
  {
    defaultMessage: 'View list detail',
  }
);

export const ERROR_EXCEPTION_LISTS = i18n.translate(
  'xpack.securitySolution.exceptions.common.errorFetching',
  {
    defaultMessage: 'Error fetching exception lists',
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_LIST_FETCH_FAILURE = i18n.translate(
  'xpack.siem.containers.exceptions.exceptionListFetchFailure',
  {
    defaultMessage: 'Failed to fetch ExceptionList and ExceptionListItems',
  }
);

export const EXCEPTION_LIST_ITEM_ADD_FAILURE = i18n.translate(
  'xpack.siem.containers.exceptions.addExceptionListItemFailure',
  {
    defaultMessage: 'Failed to update ExceptionListItem',
  }
);

export const EXCEPTION_LIST_ADD_FAILURE = i18n.translate(
  'xpack.siem.containers.exceptions.addExceptionListFailure',
  {
    defaultMessage: 'Failed to update ExceptionList',
  }
);

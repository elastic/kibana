/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASCENDING = (fieldName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.documents.search.sortBy.option.ascendingDropDownOptionLabel',
    {
      defaultMessage: '{fieldName} (asc)',
      values: { fieldName },
    }
  );

export const DESCENDING = (fieldName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.documents.search.sortBy.option.descendingDropDownOptionLabel',
    {
      defaultMessage: '{fieldName} (desc)',
      values: { fieldName },
    }
  );

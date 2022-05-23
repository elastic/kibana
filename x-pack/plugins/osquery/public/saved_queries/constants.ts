/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const SAVED_QUERIES_ID = 'savedQueryList';
export const SAVED_QUERY_ID = 'savedQuery';

export const QUERIES_DROPDOWN_LABEL = i18n.translate(
  'xpack.osquery.savedQueries.dropdown.searchFieldPlaceholder',
  {
    defaultMessage: `Search for a query to run, or write a new query below`,
  }
);
export const QUERIES_DROPDOWN_SEARCH_FIELD_LABEL = i18n.translate(
  'xpack.osquery.savedQueries.dropdown.searchFieldLabel',
  {
    defaultMessage: `Query`,
  }
);

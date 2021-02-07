/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const KQL_PLACE_HOLDER = i18n.translate('xpack.uptime.kueryBar.searchPlaceholder.kql', {
  defaultMessage:
    'Search using kql syntax for monitor IDs, names and type etc (E.g monitor.type: "http" AND tags: "dev")',
});

export const SIMPLE_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.uptime.kueryBar.searchPlaceholder.simple',
  {
    defaultMessage: 'Search by monitor ID, name, or url (E.g. http:// )',
  }
);

export const CHANGE_SEARCH_BAR_SYNTAX = i18n.translate('xpack.uptime.kueryBar.options.syntax', {
  defaultMessage: 'Change search bar syntax to use Kibana Query Language',
});

export const CHANGE_SEARCH_BAR_SYNTAX_SIMPLE = i18n.translate(
  'xpack.uptime.kueryBar.options.syntax.simple',
  {
    defaultMessage: 'Change search bar syntax to not use Kibana Query Language',
  }
);

export const SYNTAX_OPTIONS_LABEL = i18n.translate('xpack.uptime.kueryBar.options.syntax', {
  defaultMessage: 'SYNTAX OPTIONS',
});

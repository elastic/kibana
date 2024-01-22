/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILTER_IN = i18n.translate('xpack.csp.vulnerabilities.table.filterIn', {
  defaultMessage: 'Filter in',
});
export const FILTER_OUT = i18n.translate('xpack.csp.vulnerabilities.table.filterOut', {
  defaultMessage: 'Filter out',
});
export const SEARCH_BAR_PLACEHOLDER = i18n.translate(
  'xpack.csp.vulnerabilities.searchBar.placeholder',
  {
    defaultMessage: 'Search vulnerabilities (eg. vulnerability.severity : "CRITICAL" )',
  }
);
export const VULNERABILITIES = i18n.translate('xpack.csp.vulnerabilities', {
  defaultMessage: 'Vulnerabilities',
});

export const VULNERABILITIES_UNIT = (totalCount: number) =>
  i18n.translate('xpack.csp.vulnerabilities.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {vulnerability} other {vulnerabilities}}`,
  });

export const NULL_GROUPING_UNIT = i18n.translate(
  'xpack.csp.vulnerabilities.grouping.nullGroupUnit',
  {
    defaultMessage: 'vulnerabilities',
  }
);

export const NULL_GROUPING_MESSAGES = {
  RESOURCE_NAME: i18n.translate('xpack.csp.vulnerabilities.grouping.resource.nullGroupTitle', {
    defaultMessage: 'No resource',
  }),
  DEFAULT: i18n.translate('xpack.csp.vulnerabilities.grouping.default.nullGroupTitle', {
    defaultMessage: 'No grouping',
  }),
};

export const GROUPING_LABELS = {
  RESOURCE_NAME: i18n.translate('xpack.csp.findings.latestFindings.groupByResource', {
    defaultMessage: 'Resource',
  }),
};

export const groupingTitle = i18n.translate('xpack.csp.vulnerabilities.latestFindings.groupBy', {
  defaultMessage: 'Group vulnerabilities by',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GROUPING_OPTIONS } from './constants';

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

export const VULNERABILITIES_GROUPS_UNIT = (
  totalCount: number,
  selectedGroup: string,
  hasNullGroup: boolean
) => {
  const groupCount = hasNullGroup ? totalCount - 1 : totalCount;

  switch (selectedGroup) {
    case GROUPING_OPTIONS.RESOURCE_NAME:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit.resource', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {resource} other {resources}}`,
      });
    case GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit.cloudAccount', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {cloud account} other {cloud accounts}}`,
      });
    case GROUPING_OPTIONS.CVE:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit.cve', {
        values: { groupCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {CVE} other {CVEs}}`,
      });
    default:
      return i18n.translate('xpack.csp.vulnerabilities.groupUnit', {
        values: { groupCount: totalCount },
        defaultMessage: `{groupCount} {groupCount, plural, =1 {group} other {groups}}`,
      });
  }
};

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
  CLOUD_ACCOUNT_NAME: i18n.translate(
    'xpack.csp.vulnerabilities.grouping.cloudAccount.nullGroupTitle',
    {
      defaultMessage: 'No cloud account',
    }
  ),
  DEFAULT: i18n.translate('xpack.csp.vulnerabilities.grouping.default.nullGroupTitle', {
    defaultMessage: 'No grouping',
  }),
};

export const GROUPING_LABELS = {
  RESOURCE_NAME: i18n.translate('xpack.csp.vulnerabilities.groupBy.resource', {
    defaultMessage: 'Resource',
  }),
  CLOUD_ACCOUNT_NAME: i18n.translate('xpack.csp.vulnerabilities.groupBy.cloudAccount', {
    defaultMessage: 'Cloud account',
  }),
};

export const groupingTitle = i18n.translate('xpack.csp.vulnerabilities.groupBy', {
  defaultMessage: 'Group vulnerabilities by',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AppDeepLink } from '../../../../../../src/core/public';
import { DEFAULT_BASE_PATH, getCreateCasePath, getCasesConfigurePath } from './paths';

export const CasesDeepLinkIds = {
  cases: 'cases',
  casesCreate: 'cases_create',
  casesConfigure: 'cases_configure',
} as const;

export type CasesDeepLinkId = typeof CasesDeepLinkIds[keyof typeof CasesDeepLinkIds];

export const getCasesDeepLinks = <T extends AppDeepLink = AppDeepLink>({
  basePath = DEFAULT_BASE_PATH,
  extend = {},
}: {
  basePath?: string;
  extend?: Partial<Record<CasesDeepLinkId, Partial<T>>>;
}) => ({
  title: i18n.translate('xpack.cases.navigation.cases', {
    defaultMessage: 'Cases',
  }),
  keywords: [
    i18n.translate('xpack.cases.keyword.allCases', {
      defaultMessage: 'All Cases',
    }),
  ],
  ...(extend[CasesDeepLinkIds.cases] ?? {}),
  id: CasesDeepLinkIds.cases,
  path: basePath,
  deepLinks: [
    {
      title: i18n.translate('xpack.cases.navigation.create', {
        defaultMessage: 'Create New Case',
      }),
      ...(extend[CasesDeepLinkIds.casesCreate] ?? {}),
      id: CasesDeepLinkIds.casesCreate,
      path: getCreateCasePath(basePath),
    },
    {
      title: i18n.translate('xpack.cases.navigation.configure', {
        defaultMessage: 'Configure Cases',
      }),
      ...(extend[CasesDeepLinkIds.casesConfigure] ?? {}),
      id: CasesDeepLinkIds.casesConfigure,
      path: getCasesConfigurePath(basePath),
    },
  ],
});

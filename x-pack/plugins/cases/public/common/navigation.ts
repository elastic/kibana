/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AppDeepLink } from '../../../../../src/core/public';

export const casesDeepLinkIds = {
  cases: 'cases',
  casesCreate: 'cases_create',
  casesConfigure: 'cases_configure',
} as const;

export type CASES_DEEP_LINK_ID = typeof casesDeepLinkIds[keyof typeof casesDeepLinkIds];

export const getCasesCreatePath = (casesPath: string) => `${casesPath}/create`;
export const getCasesConfigurePath = (casesPath: string) => `${casesPath}/configure`;
export const getCasesDetailPath = (casesPath: string) => `${casesPath}/:detailName`;
export const getCasesSubCaseDetailPath = (casesPath: string) =>
  `${getCasesDetailPath(casesPath)}/sub-cases/:subCaseId`;
export const getCasesDetailWithCommentPath = (casesPath: string) =>
  `${getCasesDetailPath(casesPath)}/:commentId`;
export const getCasesSubCaseDetailWithCommentPath = (casesPath: string) =>
  `${getCasesSubCaseDetailPath(casesPath)}/:commentId`;

export const getCasesDeepLinks = <T extends AppDeepLink = AppDeepLink>({
  path,
  extend = {},
}: {
  path: string;
  extend?: Partial<Record<CASES_DEEP_LINK_ID, Partial<T>>>;
}) => ({
  title: i18n.translate('xpack.cases.navigation.cases', {
    defaultMessage: 'Cases',
  }),
  keywords: [
    i18n.translate('xpack.cases.keyword.allCases', {
      defaultMessage: 'All Cases',
    }),
  ],
  ...(extend[casesDeepLinkIds.cases] ?? {}),
  id: casesDeepLinkIds.cases,
  path,
  deepLinks: [
    {
      title: i18n.translate('xpack.cases.navigation.create', {
        defaultMessage: 'Create New Case',
      }),
      ...(extend[casesDeepLinkIds.casesCreate] ?? {}),
      id: casesDeepLinkIds.casesCreate,
      path: getCasesCreatePath(path),
    },
    {
      title: i18n.translate('xpack.cases.navigation.configure', {
        defaultMessage: 'Configure Cases',
      }),
      ...(extend[casesDeepLinkIds.casesConfigure] ?? {}),
      id: casesDeepLinkIds.casesConfigure,
      path: getCasesConfigurePath(path),
    },
  ],
});

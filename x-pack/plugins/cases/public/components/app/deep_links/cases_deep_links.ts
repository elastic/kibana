/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AppDeepLink } from '../../../../../../../src/core/public';
import { getCasesConfigurePath, getCasesCreatePath, getCasesPath } from '../paths';

// export const CASES_LINK_ID = 'cases' as const;
// export const CASES_CREATE_LINK_ID = 'cases_create' as const;
// export const CASES_CONFIGURE_LINK_ID = 'cases_configure' as const;

export const casesLinkId = {
  cases: 'cases',
  casesCreate: 'cases_create',
  casesConfigure: 'cases_configure',
} as const;

export type CASES_LINK_IDS = typeof casesLinkId[keyof typeof casesLinkId];

// | typeof CASES_LINK_ID
// | typeof CASES_CREATE_LINK_ID
// | typeof CASES_CONFIGURE_LINK_ID;

// export const casesDeepLinks = [{
//   id: CasesLinkId.cases,
//   title: CASE,
//   path: CASES_PATH,
//   navLinkStatus: AppNavLinkStatus.visible,
//   keywords: [
//     i18n.translate('xpack.securitySolution.search.cases', {
//       defaultMessage: 'Cases',
//     }),
//   ],
//   deepLinks: [
//               {
//       id: CasesLinkId.casesCreate,
//       title: i18n.translate('xpack.securitySolution.search.cases.create', {
//         defaultMessage: 'Create New Case',
//       }),
//       path: `${CASES_PATH}/create`,
//     },
//     {
//       id: CasesLinkId.casesConfigure,
//       title: i18n.translate('xpack.securitySolution.search.cases.configure', {
//         defaultMessage: 'Configure Cases',
//       }),
//       path: `${CASES_PATH}/configure`,
//     },
//   ],
// }];
export interface GetCasesDeepLink {
  basePath?: string;
  extend?: Partial<Record<CASES_LINK_IDS, Partial<AppDeepLink>>>;
}

export const getCasesDeepLink = ({ basePath, extend = {} }: GetCasesDeepLink): AppDeepLink => ({
  title: i18n.translate('xpack.cases.navigation.cases', {
    defaultMessage: 'Cases',
  }),
  keywords: [
    i18n.translate('xpack.cases.keyword.allCases', {
      defaultMessage: 'All Cases',
    }),
  ],
  ...(extend[casesLinkId.cases] ? extend[casesLinkId.cases] : {}),
  id: casesLinkId.cases,
  path: getCasesPath(basePath),
  deepLinks: [
    {
      title: i18n.translate('xpack.cases.navigation.create', {
        defaultMessage: 'Create New Case',
      }),
      ...(extend[casesLinkId.casesCreate] ? extend[casesLinkId.casesCreate] : {}),
      id: casesLinkId.casesCreate,
      path: getCasesCreatePath(basePath),
    },
    {
      title: i18n.translate('xpack.cases.navigation.configure', {
        defaultMessage: 'Configure Cases',
      }),
      ...(extend[casesLinkId.casesConfigure] ? extend[casesLinkId.casesConfigure] : {}),
      id: casesLinkId.casesConfigure,
      path: getCasesConfigurePath(basePath),
    },
  ],
});

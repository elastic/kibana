/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCasesDeepLinks } from '@kbn/cases-plugin/public';
import { CASES_PATH, SecurityPageName } from '../../common/constants';
import { FEATURE, LinkItem } from '../common/links/types';

export const getCasesLinkItems = (): LinkItem => {
  const casesLinks = getCasesDeepLinks<LinkItem>({
    basePath: CASES_PATH,
    extend: {
      [SecurityPageName.case]: {
        globalNavEnabled: true,
        globalNavOrder: 9006,
        features: [FEATURE.casesRead],
      },
      [SecurityPageName.caseConfigure]: {
        features: [FEATURE.casesCrud],
        skipUrlState: true,
        isPremium: true,
      },
      [SecurityPageName.caseCreate]: {
        features: [FEATURE.casesCrud],
      },
    },
  });
  const { id, deepLinks, ...rest } = casesLinks;
  return {
    ...rest,
    id: SecurityPageName.case,
    links: deepLinks.map((link) => {
      const { id: subId, ...all } = link;
      if (subId === SecurityPageName.caseConfigure) {
        return { ...all, id: SecurityPageName.caseConfigure };
      }
      return { ...all, id: SecurityPageName.caseCreate };
    }),
  };
};

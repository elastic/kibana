/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCasesDeepLinks } from '@kbn/cases-plugin/public';
import { CASES_FEATURE_ID, CASES_PATH, SecurityPageName } from '../../common/constants';
import { LinkItem } from '../common/links/types';

export const getCasesLinkItems = (): LinkItem => {
  const casesLinks = getCasesDeepLinks<LinkItem>({
    basePath: CASES_PATH,
    extend: {
      [SecurityPageName.case]: {
        globalNavEnabled: true,
        globalNavOrder: 4,
        capabilities: [`${CASES_FEATURE_ID}.read_cases`],
      },
      [SecurityPageName.caseConfigure]: {
        capabilities: [`${CASES_FEATURE_ID}.crud_cases`],
        licenseType: 'gold',
        sideNavDisabled: true,
        hideTimeline: true,
      },
      [SecurityPageName.caseCreate]: {
        capabilities: [`${CASES_FEATURE_ID}.crud_cases`],
        sideNavDisabled: true,
        hideTimeline: true,
      },
    },
  });
  const { id, deepLinks, ...rest } = casesLinks;
  return {
    ...rest,
    id: SecurityPageName.case,
    links: deepLinks as LinkItem[],
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
} from '@kbn/cases-plugin/common';
import { getCasesDeepLinks } from '@kbn/cases-plugin/public';
import { CASES_FEATURE_ID, CASES_PATH, SecurityPageName } from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const getCasesLinkItems = (): LinkItem => {
  const casesLinks = getCasesDeepLinks<LinkItem>({
    basePath: CASES_PATH,
    extend: {
      [SecurityPageName.case]: {
        globalNavPosition: 5,
        capabilities: [`${CASES_FEATURE_ID}.${READ_CASES_CAPABILITY}`],
      },
      [SecurityPageName.caseConfigure]: {
        capabilities: [`${CASES_FEATURE_ID}.${UPDATE_CASES_CAPABILITY}`],
        licenseType: 'gold',
        sideNavDisabled: true,
      },
      [SecurityPageName.caseCreate]: {
        capabilities: [`${CASES_FEATURE_ID}.${CREATE_CASES_CAPABILITY}`],
        sideNavDisabled: true,
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

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

const casesDeepLinks = getCasesDeepLinks({ basePath: CASES_PATH });
const { id, deepLinks, ...casesDeepLink } = casesDeepLinks;
// Mind the array order returned by getCasesDeepLinks
const [casesConfigureDeepLink, casesCreateDeepLink] = deepLinks;

// Extends AppDeepLink to return LinkItem type
export const links: LinkItem = {
  ...casesDeepLink,
  id: SecurityPageName.case,
  globalNavPosition: 5,
  capabilities: [`${CASES_FEATURE_ID}.${READ_CASES_CAPABILITY}`],
  links: [
    {
      ...casesConfigureDeepLink,
      id: SecurityPageName.caseConfigure,
      capabilities: [`${CASES_FEATURE_ID}.${UPDATE_CASES_CAPABILITY}`],
      licenseType: 'gold',
      sideNavDisabled: true,
    },
    {
      ...casesCreateDeepLink,
      id: SecurityPageName.caseCreate,
      capabilities: [`${CASES_FEATURE_ID}.${CREATE_CASES_CAPABILITY}`],
      sideNavDisabled: true,
    },
  ],
};

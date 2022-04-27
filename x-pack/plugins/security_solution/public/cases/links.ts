/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCasesLinkItems } from '@kbn/cases-plugin/public';
import { CASES_PATH, SecurityPageName } from '../../common/constants';
import { FEATURE, LinkItem } from '../common/links/types';

export const links: LinkItem = getCasesLinkItems({
  basePath: CASES_PATH,
  extend: {
    [SecurityPageName.case]: {
      globalNavEnabled: true,
      globalNavOrder: 9006,
      features: [FEATURE.casesRead],
    },
    [SecurityPageName.caseConfigure]: {
      features: [FEATURE.casesCrud],
      isPremium: true,
    },
    [SecurityPageName.caseCreate]: {
      features: [FEATURE.casesCrud],
    },
  },
});

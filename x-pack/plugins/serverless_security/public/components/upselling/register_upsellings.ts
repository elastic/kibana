/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpsellingService } from '@kbn/security-solution-plugin/public';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { CasesUpselling } from './pages/cases_upselling';
import { PrebuiltRulesTooltipUpselling } from './pages/rules_upselling';

export const registerUpsellings = (upselling: UpsellingService) => {
  upselling.registerPages({
    [SecurityPageName.case]: CasesUpselling,
  });

  upselling.registerSections({
    load_prebuilt_rules: {
      capabilities: ['siem.prebuilt-rules'],
      component: PrebuiltRulesTooltipUpselling,
    },
  });
};

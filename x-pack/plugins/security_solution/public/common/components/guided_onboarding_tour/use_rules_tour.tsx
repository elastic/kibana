/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useTourContext } from './tour';
import type { RulesQueryResponse } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useFindRulesQuery } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { SecurityStepId } from './tour_config';
const GUIDED_ONBOARDING_RULES_FILTER = {
  filter: '',
  showCustomRules: false,
  showElasticRules: true,
  tags: ['Guided Onboarding'],
};
export const useRulesTour = () => {
  const { isTourShown, endTourStep, incrementStep, activeStep, setActiveStep } = useTourContext();
  const { data: onboardingRules } = useFindRulesQuery(
    { filterOptions: GUIDED_ONBOARDING_RULES_FILTER },
    { retry: false, enabled: isTourShown(SecurityStepId.rules) }
  );

  const manageRulesTour = useCallback(
    ({ rules }: RulesQueryResponse) => {
      if (rules && rules.length === 0 && isTourShown(SecurityStepId.rules) && activeStep === 2) {
        // reset to 1 if they are on step 2 but have no onboarding rules
        setActiveStep(SecurityStepId.rules, 1);
      }
      if (rules && rules.length > 0 && isTourShown(SecurityStepId.rules) && activeStep === 1) {
        // There are onboarding rules now, advance to step 2 if on step 1
        incrementStep(SecurityStepId.rules);
      }
      if (rules.some((rule) => rule.enabled)) {
        // The onboarding rule is enabled, end the tour
        endTourStep(SecurityStepId.rules);
      }
    },
    [activeStep, endTourStep, incrementStep, isTourShown, setActiveStep]
  );

  useEffect(() => {
    if (onboardingRules) {
      manageRulesTour(onboardingRules);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingRules]);
};

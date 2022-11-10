/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourActions, EuiTourStepProps } from '@elastic/eui';
import { EuiTourStep } from '@elastic/eui';
import { noop } from 'lodash';
import React, { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useKibana } from '../../../../common/lib/kibana';
import { useFindRulesQuery } from '../../../rule_management/api/hooks/use_find_rules_query';
import * as i18n from './translations';
import { useIsElementMounted } from './use_is_element_mounted';

export const INSTALL_PREBUILT_RULES_ANCHOR = 'install-prebuilt-rules-anchor';
export const SEARCH_FIRST_RULE_ANCHOR = 'search-first-rule-anchor';

export interface RulesFeatureTourContextType {
  steps: EuiTourStepProps[];
  actions: EuiTourActions;
}

const GUIDED_ONBOARDING_RULES_FILTER = {
  filter: '',
  showCustomRules: false,
  showElasticRules: true,
  tags: ['Guided Onboarding'],
};

export enum GuidedOnboardingRulesStatus {
  'inactive' = 'inactive',
  'installRules' = 'installRules',
  'activateRules' = 'activateRules',
  'completed' = 'completed',
}

export const RulesManagementTour = () => {
  const { guidedOnboardingApi } = useKibana().services.guidedOnboarding;

  const isRulesStepActive = useObservable(
    guidedOnboardingApi?.isGuideStepActive$('security', 'rules') ?? of(false),
    false
  );

  const { data: onboardingRules } = useFindRulesQuery(
    { filterOptions: GUIDED_ONBOARDING_RULES_FILTER },
    { enabled: isRulesStepActive }
  );

  const tourStatus = useMemo(() => {
    if (!isRulesStepActive || !onboardingRules) {
      return GuidedOnboardingRulesStatus.inactive;
    }

    if (onboardingRules.total === 0) {
      // Onboarding rules are not installed - show the install/update rules step
      return GuidedOnboardingRulesStatus.installRules;
    }

    if (!onboardingRules.rules.some((rule) => rule.enabled)) {
      // None of the onboarding rules is active - show the activate step
      return GuidedOnboardingRulesStatus.activateRules;
    }

    // Rules are installed and enabled - the tour is completed
    return GuidedOnboardingRulesStatus.completed;
  }, [isRulesStepActive, onboardingRules]);

  // Synchronize the current "internal" tour step with the global one
  useEffect(() => {
    if (isRulesStepActive && tourStatus === GuidedOnboardingRulesStatus.completed) {
      guidedOnboardingApi?.completeGuideStep('security', 'rules');
    }
  }, [guidedOnboardingApi, isRulesStepActive, tourStatus]);

  /**
   * Wait until the tour target elements are visible on the page and mount
   * EuiTourStep components only after that. Otherwise, the tours would never
   * show up on the page.
   */
  const isInstallRulesAnchorMounted = useIsElementMounted(INSTALL_PREBUILT_RULES_ANCHOR);
  const isSearchFirstRuleAnchorMounted = useIsElementMounted(SEARCH_FIRST_RULE_ANCHOR);

  return (
    <>
      {isInstallRulesAnchorMounted && (
        <EuiTourStep
          title={i18n.INSTALL_PREBUILT_RULES_TITLE}
          content={i18n.INSTALL_PREBUILT_RULES_CONTENT}
          onFinish={noop}
          step={1}
          stepsTotal={2}
          isOpen={tourStatus === GuidedOnboardingRulesStatus.installRules}
          anchor={`#${INSTALL_PREBUILT_RULES_ANCHOR}`}
          anchorPosition="downCenter"
          footerAction={<div />} // Replace "Skip tour" with an empty element
        />
      )}
      {isSearchFirstRuleAnchorMounted && (
        <EuiTourStep
          title={i18n.SEARCH_FIRST_RULE_TITLE}
          content={i18n.SEARCH_FIRST_RULE_CONTENT}
          onFinish={noop}
          step={2}
          stepsTotal={2}
          isOpen={tourStatus === GuidedOnboardingRulesStatus.activateRules}
          anchor={`#${SEARCH_FIRST_RULE_ANCHOR}`}
          anchorPosition="upCenter"
          footerAction={<div />} // Replace "Skip tour" with an empty element
        />
      )}
    </>
  );
};

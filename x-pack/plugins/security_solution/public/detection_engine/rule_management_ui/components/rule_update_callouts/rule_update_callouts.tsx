/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React, { useCallback } from 'react';
import { SecurityPageName } from '../../../../app/types';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { useKibana } from '../../../../common/lib/kibana';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { MiniCallout } from '../mini_callout/mini_callout';
import {
  getUpdateRulesCalloutTitle,
  NEW_PREBUILT_RULES_AVAILABLE_CALLOUT_TITLE,
} from '../mini_callout/translations';
import { AllRulesTabs } from '../rules_table/rules_table_toolbar';

export const RuleUpdateCallouts = () => {
  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();

  const rulesToInstallCount = prebuiltRulesStatus?.num_prebuilt_rules_to_install ?? 0;
  const rulesToUpgradeCount = prebuiltRulesStatus?.num_prebuilt_rules_to_upgrade ?? 0;

  // Check against rulesInstalledCount since we don't want to show banners if we're showing the empty prompt
  const shouldDisplayNewRulesCallout = rulesToInstallCount > 0;
  const shouldDisplayUpdateRulesCallout = rulesToUpgradeCount > 0;

  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { href } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rules,
    path: AllRulesTabs.updates,
  });
  const {
    application: { navigateToUrl },
  } = useKibana().services;

  const updateCallOutOnClick = useCallback(() => {
    navigateToUrl(href);
  }, [navigateToUrl, href]);

  return (
    <EuiFlexGroup direction="column">
      {shouldDisplayUpdateRulesCallout && (
        <MiniCallout
          iconType={'iInCircle'}
          data-test-subj="prebuilt-rules-update-callout"
          title={getUpdateRulesCalloutTitle(updateCallOutOnClick)}
        />
      )}
      {shouldDisplayNewRulesCallout && (
        <MiniCallout
          color="success"
          data-test-subj="prebuilt-rules-new-callout"
          iconType={'iInCircle'}
          title={NEW_PREBUILT_RULES_AVAILABLE_CALLOUT_TITLE}
        />
      )}
    </EuiFlexGroup>
  );
};
